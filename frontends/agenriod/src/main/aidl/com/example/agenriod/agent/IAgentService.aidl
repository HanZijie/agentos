package com.example.agenriod.agent;
import android.os.ParcelFileDescriptor;
import com.example.agenriod.agent.IAgentServiceCallback;
interface IAgentService {
    void registerCallback(IAgentServiceCallback callback);
    void unregisterCallback(IAgentServiceCallback callback);
    String command(String name, in ParcelFileDescriptor payload);
}
