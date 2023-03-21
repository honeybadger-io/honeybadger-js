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
        final Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            public void run() {
                Log.d("ThrowErrModule", "Throwing delayed exception");
                throw new RuntimeException("Test Delayed Exception");
            }
        }, 5000);

//         throw new RuntimeException("Sample_Android_Exception");
    }


}

