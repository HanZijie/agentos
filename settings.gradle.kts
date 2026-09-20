pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
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

rootProject.name = "AgentOS"

include(
    ":frontends:agenriod",
    ":plugins:api",
    ":plugins:notes",
    ":libraries:file-broker",
    ":libraries:mcp-client",
)

project(":frontends:agenriod").projectDir = file("frontends/agenriod")
project(":plugins:api").projectDir = file("plugins/api")
project(":plugins:notes").projectDir = file("plugins/notes")
project(":libraries:file-broker").projectDir = file("libraries/file-broker")
project(":libraries:mcp-client").projectDir = file("libraries/mcp-client")
