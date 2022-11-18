//
// Honeybadger React Native
//
// Andrey Butov
//
// Copyright (c) 2020 Honeybadger.io. All Rights Reserved.
//



#import "HoneybadgerReactNative.h"
#import <React/RCTAssert.h>
#include <execinfo.h>
#import <mach-o/arch.h>
#include <mach-o/dyld.h>
#include <dlfcn.h>



@implementation HoneybadgerReactNative
{
    BOOL _hasObservers;
}


RCT_EXPORT_MODULE()


RCT_EXPORT_METHOD(start)
{
    [NSNotificationCenter.defaultCenter removeObserver:self]; // important

    [NSNotificationCenter.defaultCenter
        addObserver:self
        selector:@selector(onCFuncCaughtException:)
        name:@"notification-c-func-caught-exception"
        object:nil];

    NSSetUncaughtExceptionHandler(&c_func_on_exception);
    
    RCTSetFatalHandler(^(NSError* error) {
        [self onError:error initialHandler:@"RCTSetFatalHandler"];
    });
    
    RCTSetFatalExceptionHandler(^(NSException* e) {
        [self onException:e initialHandler:@"RCTSetFatalExceptionHandler"];
    });
}



- (void) onCFuncCaughtException:(NSNotification*)notification
{
    NSLog(@"onCFuncCaughtException");
    
    if ( !notification || !notification.userInfo ) {
        return;
    }
    
    NSException* e = notification.userInfo[@"exception"];
    if ( !e ) {
        return;
    }

    NSString* initialHandler = notification.userInfo[@"initialHandler"];
    if ( !initialHandler || initialHandler.length == 0 ) {
        initialHandler = @"onCFuncCaughtException";
    }
        
    [self onException:e initialHandler:initialHandler];
}



- (void) onException:(NSException*)e initialHandler:(NSString*)handler
{
    if ( !e ) {
        return;
    }
    
    if ( !handler || handler.length == 0 ) {
        handler = @"onException";
    }

    NSArray* reactNativeStackTrace = [self arrayValueForKey:RCTJSStackTraceKey fromDictionary:e.userInfo];
    
    NSDictionary* crashData = @{
        @"type" : @"Exception",
        @"architecture" : [self getArchitecture],
        @"reactNativeStackTrace" : reactNativeStackTrace ? reactNativeStackTrace : @[],
        @"name" : [self safe:e.name],
        @"reason" : [self safe:e.reason],
        @"userInfo" : e.userInfo ? e.userInfo : @{},
        @"callStackSymbols" : e.callStackSymbols ? e.callStackSymbols : @[],
        @"initialHandler" : handler
    };

    [self sendEventWithName:@"native-exception-event" body:crashData];

    [NSThread sleepForTimeInterval:3.0];
}



- (void) onError:(NSError*)e initialHandler:(NSString*)handler
{
    if ( !e ) {
        return;
    }
    
    if ( !handler || handler.length == 0 ) {
        handler = @"onError";
    }
    
    NSString* localizedDescription = [self safe:e.localizedDescription];
    NSDictionary* userInfo = e.userInfo;
    NSString* errorDomain = [self safe:e.domain];
    NSArray* reactNativeStackTrace = [self arrayValueForKey:RCTJSStackTraceKey fromDictionary:userInfo];
    
    [self sendEventWithName:@"native-exception-event" body:@{
        @"type" : @"Error",
        @"architecture" : [self getArchitecture],
        @"errorDomain" : errorDomain,
        @"localizedDescription" : localizedDescription,
        @"reactNativeStackTrace" : reactNativeStackTrace ? reactNativeStackTrace : @[],
        @"initialHandler" : handler
    }];
}



- (void) onSignal:(int)sig initialHandler:(NSString*)handler
{
    if ( !handler || handler.length == 0 ) {
        handler = @"onSignal";
    }

    [self sendEventWithName:@"native-exception-event" body:@{
        @"type" : @"Signal",
        @"architecture" : [self getArchitecture],
        @"initialHandler" : handler
    }];
}



- (NSString*) getArchitecture
{
    const NXArchInfo* info = NXGetLocalArchInfo();
    return [NSString stringWithUTF8String:info->name];
}



#pragma mark - C functions - initial handlers for certain iOS exceptions and signals

void c_func_on_exception(NSException* e)
{
    if ( !e ) {
        return;
    }

    [NSNotificationCenter.defaultCenter
        postNotificationName:@"notification-c-func-caught-exception"
        object:nil
        userInfo:@{
            @"exception" : e,
            @"initialHandler" : @"c_func_on_exception"
        }
    ];
}


#pragma mark - RCTBridge

- (NSArray*) extraModulesForBridge:(RCTBridge*)bridge {
    return @[[[RCTExceptionsManager alloc] initWithDelegate:self]];
}


#pragma mark - RCTExceptionsManagerDelegate

- (void) handleSoftJSExceptionWithMessage:(NSString*)message stack:(NSArray*)stack exceptionId:(NSNumber*)exceptionId 
{
}


- (void) handleFatalJSExceptionWithMessage:(NSString*)message stack:(NSArray*)stack exceptionId:(NSNumber*)exceptionId 
{
}


#pragma mark - RCTEventEmitter

- (NSArray<NSString*>*) supportedEvents {
    return @[@"native-exception-event"];
}

- (void) startObserving {
    _hasObservers = TRUE;
}

- (void) stopObserving {
    _hasObservers = FALSE;
}


#pragma mark - Utils

- (BOOL) isDictionary:(id)obj
{
    return obj && [obj isKindOfClass:[NSDictionary class]];
}


- (BOOL) isArray:(id)obj
{
    return obj && [obj isKindOfClass:[NSArray class]];
}


- (BOOL) isString:(id)obj
{
    return obj && [obj isKindOfClass:[NSString class]];
}



- (NSString*) safe:(NSString*)s
{
    return s != nil ? s : @"";
}



- (NSArray*) arrayValueForKey:(NSString*)key fromDictionary:(NSDictionary*)dict
{
    if ( !dict ) {
        return nil;
    }

    NSObject* obj = dict[key];

    return obj ? [self toArrayOrArrayOfOne:obj] : nil;
}



- (NSDictionary*) dictionaryFromJSONString:(NSString*)json
{
    NSError* error;

    NSDictionary* d = [NSJSONSerialization JSONObjectWithData:[json dataUsingEncoding:NSUTF8StringEncoding]
        options: NSJSONReadingMutableContainers
        error: &error];

    if ( error ) {
        NSLog(@"%@", error.localizedDescription);
        return nil;
    }

    return d;
}


- (NSArray*) toArrayOrArrayOfOne:(NSObject*)obj
{
    if ( !obj ) {
        return nil;
    }
    
    if ( [self isArray:obj] ) {
        return (NSArray*)obj;
    }
    
    if ( [self isDictionary:obj] ) {
        return @[(NSDictionary*)obj];
    }
    
    if ( [self isString:obj] ) {
        return @[[self dictionaryFromJSONString:(NSString*)obj]];
    }
    
    return nil;
}

@end
