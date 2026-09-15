plugins { alias(libs.plugins.android.library) }

android { buildFeatures { aidl = true }; namespace = "com.example.agenriod.plugin"; compileSdk { version = release(37) }; defaultConfig { minSdk = 30 } }
