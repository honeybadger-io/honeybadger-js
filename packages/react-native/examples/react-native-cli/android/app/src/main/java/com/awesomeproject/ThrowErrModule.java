package com.awesomeproject;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public class ThrowErrModule extends ReactContextBaseJavaModule {
    @Override
    public String getName() {
        return "ThrowErrModule";
    }

    ThrowErrModule(ReactApplicationContext context) {
        super(context);
    }

    @ReactMethod
    public void throwErr() {
//        This delayed error ends up caught and sent to Honeybadger
//        in my current version of the code, as well as the existing
//        published package.
        final Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            public void run() {
                Log.d("ThrowErrModule", "Throwing delayed exception");
                throw new RuntimeException("Test Delayed Exception");
            }
        }, 5000);

//        ****************************
//        TODO: This direct throw does not get captured by either my current code
//        or the existing published package. Why?
//        The error shows up in the android simulator UI, however
//        the javascript listener for 'native-exception-event' is not triggered
//        ***************************
//         throw new RuntimeException("Sample_Android_Exception");
    }


}

