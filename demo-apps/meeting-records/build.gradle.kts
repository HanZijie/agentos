plugins { alias(libs.plugins.android.application) }

android {
    namespace = "com.example.agentos.demo.records"
    compileSdk { version = release(37) }
    buildFeatures { aidl = true }

    defaultConfig {
        applicationId = "com.example.agentos.demo.records"
        minSdk = 30
        targetSdk = 37
        versionCode = 1
        versionName = "0.1"
    }
}

dependencies { implementation(project(":plugin-api")) }
