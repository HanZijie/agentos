plugins { alias(libs.plugins.android.application) }

android { namespace = "com.example.agenriod.notes"; compileSdk { version = release(36) }; defaultConfig { applicationId = "com.example.agenriod.notes"; minSdk = 30; targetSdk = 36; versionCode = 1; versionName = "1.0" } }
dependencies { implementation(project(":plugins:api")) }
