plugins { alias(libs.plugins.android.library) }

android {
    namespace = "com.example.agenriod.mcp"
    compileSdk { version = release(37) }
    defaultConfig { minSdk = 30 }
}
