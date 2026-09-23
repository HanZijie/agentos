plugins { alias(libs.plugins.android.library) }

android {
    namespace = "com.example.agenriod.mcp"
    compileSdk { version = release(36) }
    defaultConfig { minSdk = 30 }
}
