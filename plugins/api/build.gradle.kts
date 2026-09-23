plugins { alias(libs.plugins.android.library) }

android { buildFeatures { aidl = true }; namespace = "com.example.agenriod.plugin"; compileSdk { version = release(36) }; defaultConfig { minSdk = 30 } }

dependencies { implementation(libs.coroutines.android) }
