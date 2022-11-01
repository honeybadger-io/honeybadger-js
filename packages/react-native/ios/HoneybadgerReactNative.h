//
// Honeybadger React Native
//
// Andrey Butov
//
// Copyright (c) 2020 Honeybadger.io. All Rights Reserved.
//


#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTExceptionsManager.h>


@interface HoneybadgerReactNative : RCTEventEmitter <RCTBridgeModule, RCTExceptionsManagerDelegate>
@end
