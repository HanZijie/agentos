package com.example.agenriod.agent;
import android.os.ParcelFileDescriptor;
oneway interface IAgentServiceCallback {
    void onStateChanged(long revision, in ParcelFileDescriptor snapshot);
}
