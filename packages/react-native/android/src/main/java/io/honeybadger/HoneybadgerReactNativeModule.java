//
// Honeybadger React Native
//

package io.honeybadger;


import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;


public class HoneybadgerReactNativeModule extends ReactContextBaseJavaModule {

    private static final String TAG = "HoneybadgerReactNative";

    private ReactApplicationContext reactContext;

    public HoneybadgerReactNativeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "HoneybadgerReactNative";
    }

    @ReactMethod
    public void start() {
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
                @Override
                public void uncaughtException(Thread paramThread, Throwable paramThrowable) {
                    Throwable cause = getRootCause(paramThrowable);
                    if ( cause == null ) {
                        return;
                    }

                    String message = cause.getMessage();
                    if ( message == null ) {
                        message = "Error";
                    }

                    StackTraceElement[] stackTrace = cause.getStackTrace();
                    WritableArray stackTraceArray = Arguments.createArray();
                    if ( stackTrace != null ) {
                        for ( StackTraceElement stackTraceElement : stackTrace ) {
                            WritableMap stackTraceObj = Arguments.createMap();
                            String fileName = stackTraceElement.getFileName();
                            String className = stackTraceElement.getClassName();
                            String methodName = stackTraceElement.getMethodName();
                            int lineNumber = stackTraceElement.getLineNumber();
                            stackTraceObj.putString("file", fileName != null ? fileName : "");
                            stackTraceObj.putString("class", className != null ? className : "");
                            stackTraceObj.putString("method", methodName != null ? methodName : "");
                            stackTraceObj.putInt("line", lineNumber > 0 ? lineNumber : 0);
                            stackTraceArray.pushMap(stackTraceObj);
                        }
                    }

                    WritableMap crashData = Arguments.createMap();
                    crashData.putString("type", "Exception");
                    crashData.putString("message", message);
                    crashData.putArray("stackTrace", stackTraceArray);

                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("native-exception-event", crashData);

                    // Give JS some time to process the error before shutting down the process.
                    try {
                        Thread.sleep(3000);
                    } catch ( InterruptedException e ) {
                    }
                }
            }
        );
    }

    // Required for React-Native built in EventEmitter Calls.
    @ReactMethod
    public void addListener(String eventName) {

    }

    // Required for React-Native built in EventEmitter Calls.
    @ReactMethod
    public void removeListeners(Integer count) {

    }

    private Throwable getRootCause ( Throwable throwable ) {
        Throwable cause = throwable.getCause();
        return cause == null ? throwable : getRootCause(cause);
    }
}
