pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "AgentOSDemoApps"

include(":plugin-api", ":meeting-records", ":calendar", ":alarm")

// Keep the demo on the existing, versioned AgentOS Plugin contract without
// adding this demo root to the main project's module graph.
project(":plugin-api").projectDir = file("../plugins/api")
