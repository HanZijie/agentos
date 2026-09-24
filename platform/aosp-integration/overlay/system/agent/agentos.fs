# Keep the development runtime secret readable only by root.  init copies it
# to /data/agent/secrets before sideagentd starts; the source copy in /system
# must not be world-readable from a userdebug shell or another app.
[system/etc/agentos/agent.env]
mode: 0600
user: AID_ROOT
group: AID_ROOT
caps: 0
