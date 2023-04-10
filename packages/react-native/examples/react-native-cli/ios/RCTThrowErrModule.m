//
//  RCTThrowErrModule.m
//  AwesomeProject
//
//  Created by Bethany Berkowitz on 3/14/23.
//

#import "RCTThrowErrModule.h"
#import <React/RCTLog.h>

@implementation RCTThrowErrModule



// To export a module named RCTThrowErrModule
RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(throwErr)
{
    @throw [NSException exceptionWithName:@"Sample_iOS_Exception" reason:@"Testing native iOS exception" userInfo:nil];
}



@end
