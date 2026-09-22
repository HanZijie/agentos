package com.example.agentos.probe;

import android.app.Activity;
import android.os.Bundle;
import android.os.Process;
import android.widget.TextView;

/** Lets the real test APK enter foreground and cached states during freezer checks. */
public final class ProbeActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        TextView text = new TextView(this);
        text.setText("AgentOS discovery probe\nUID " + Process.myUid()
                + "\nPID " + Process.myPid() + "\nEnable through cmd agentos on a userdebug image.");
        setContentView(text);
    }
}
