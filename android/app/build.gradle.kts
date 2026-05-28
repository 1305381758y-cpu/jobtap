import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun String.isUnsafeReleaseUrl(): Boolean {
    val trimmed = trim()
    if (trimmed.isBlank()) return true

    val uri = runCatching { URI(trimmed) }.getOrNull() ?: return true
    val host = uri.host
        ?.lowercase()
        ?.trimEnd('.')
        ?.removeSurrounding("[", "]")
        ?: return true
    val unsafeDomains = setOf(
        "localhost",
        "127.0.0.1",
        "0:0:0:0:0:0:0:1",
        "::1",
        "10.0.2.2",
        "0.0.0.0",
    )
    val placeholderHosts = setOf("example", "test", "invalid")
    val isKnownUnsafe = unsafeDomains.any { host == it || host.endsWith(".$it") }
    val isPlaceholder = host in placeholderHosts || host.endsWith(".invalid") || host.endsWith(".test")
    val isExampleWildcard = host.startsWith("example.") || host.contains(".example.")

    return uri.scheme?.lowercase() != "https" ||
        !host.contains(".") ||
        isKnownUnsafe ||
        isPlaceholder ||
        isExampleWildcard
}

fun propOrEnv(propertyName: String, envName: String): String? {
    return project.findProperty(propertyName)?.toString()
        ?: System.getenv(envName)
}

fun boolPropOrEnv(propertyName: String, envName: String): Boolean {
    return propOrEnv(propertyName, envName)?.trim()?.lowercase() in setOf("1", "true", "yes")
}

fun List<String>.requestsReleaseArtifact(): Boolean {
    fun String.matchesCamelCaseAbbreviation(target: String): Boolean {
        val candidate = lowercase()
        val first = target.substringBefore("Release").lowercase()
        val second = "release"

        return (1..first.length).any { firstLength ->
            (1..second.length).any { secondLength ->
                candidate == first.take(firstLength) + second.take(secondLength)
            }
        }
    }

    return any { taskName ->
        val simple = taskName.substringAfterLast(":")
        val lower = simple.lowercase()

        if (lower.contains("release")) return@any true
        if (lower in setOf("assemble", "bundle", "build")) return@any true

        listOf("assembleRelease", "bundleRelease", "buildRelease")
            .any { simple.matchesCamelCaseAbbreviation(it) }
    }
}

android {
    namespace = "com.jobtap.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jobtap.app"
        minSdk = 26
        targetSdk = 35
        versionCode = propOrEnv("versionCode", "JOBTAP_VERSION_CODE")?.toIntOrNull() ?: 1
        versionName = propOrEnv("versionName", "JOBTAP_VERSION_NAME") ?: "1.0.0"

        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000\"")
    }

    signingConfigs {
        create("release") {
            val storeFileProp = propOrEnv("releaseStoreFile", "JOBTAP_RELEASE_STORE_FILE")
            val storePasswordProp = propOrEnv("releaseStorePassword", "JOBTAP_RELEASE_STORE_PASSWORD")
            val keyAliasProp = propOrEnv("releaseKeyAlias", "JOBTAP_RELEASE_KEY_ALIAS")
            val keyPasswordProp = propOrEnv("releaseKeyPassword", "JOBTAP_RELEASE_KEY_PASSWORD")

            if (storeFileProp != null && storePasswordProp != null && keyAliasProp != null && keyPasswordProp != null) {
                storeFile = file(storeFileProp)
                storePassword = storePasswordProp
                keyAlias = keyAliasProp
                keyPassword = keyPasswordProp
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000\"")
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )

            val defaultReleaseUrl = "https://api.jobtap.app"
            val releaseUrl = (propOrEnv("releaseApiUrl", "JOBTAP_RELEASE_API_BASE_URL") ?: defaultReleaseUrl).trim()
                .also { url ->
                    if (url.isUnsafeReleaseUrl()) {
                        throw GradleException(
                            "Release API URL '$url' is unsafe. Release builds must use " +
                            "HTTPS with a valid production host (not localhost/127.0.0.1/10.0.2.2/" +
                            "example.* or http). " +
                            "Configure via -PreleaseApiUrl=https://your-api.com or JOBTAP_RELEASE_API_BASE_URL."
                        )
                    }
                }
            buildConfigField("String", "API_BASE_URL", "\"$releaseUrl\"")

            val releaseSigning = signingConfigs.findByName("release")
            val signingInputs = listOf(
                propOrEnv("releaseStoreFile", "JOBTAP_RELEASE_STORE_FILE"),
                propOrEnv("releaseStorePassword", "JOBTAP_RELEASE_STORE_PASSWORD"),
                propOrEnv("releaseKeyAlias", "JOBTAP_RELEASE_KEY_ALIAS"),
                propOrEnv("releaseKeyPassword", "JOBTAP_RELEASE_KEY_PASSWORD"),
            )
            val anySigningInput = signingInputs.any { !it.isNullOrBlank() }
            val hasReleaseKey = releaseSigning?.storeFile?.isFile == true &&
                !releaseSigning.storePassword.isNullOrBlank() &&
                !releaseSigning.keyAlias.isNullOrBlank() &&
                !releaseSigning.keyPassword.isNullOrBlank()
            val requiresSignedRelease = boolPropOrEnv("requireReleaseSigning", "JOBTAP_REQUIRE_RELEASE_SIGNING")
            val isReleaseArtifactRequest = gradle.startParameter.taskNames.requestsReleaseArtifact()

            if (isReleaseArtifactRequest && anySigningInput && !hasReleaseKey) {
                throw GradleException(
                    "Release signing configuration is incomplete or the keystore file does not exist. " +
                    "Provide releaseStoreFile, releaseStorePassword, releaseKeyAlias, and releaseKeyPassword."
                )
            }
            if (hasReleaseKey) {
                signingConfig = releaseSigning
            } else if (isReleaseArtifactRequest && requiresSignedRelease) {
                throw GradleException(
                    "Signed release artifact required, but no production release signing configuration was provided."
                )
            } else if (isReleaseArtifactRequest) {
                logger.warn(
                    "WARNING: Release signing not configured. The release artifact will be unsigned, " +
                    "not debug-signed. Provide release signing properties for Play/App Store submission."
                )
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.10"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20231013")
}
