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

RCT_EXPORT_METHOD(throwErr:(NSString *)name location:(NSString *)location)
{
  RCTLogInfo(@"Throwing an error %@ at %@", name, location);
//  This causes an error
  NSArray *array = @[];
  array[1];
}



@end
