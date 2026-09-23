plugins { alias(libs.plugins.android.library) }

android { namespace = "com.example.agenriod.filebroker"; compileSdk { version = release(36) }; defaultConfig { minSdk = 30 } }

dependencies { implementation(libs.coroutines.android) }
