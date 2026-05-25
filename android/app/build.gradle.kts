plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun String.isUnsafeReleaseUrl(): Boolean {
    val lower = this.lowercase()
    return lower.isBlank() ||
        lower.startsWith("http://") ||
        lower.startsWith("https://localhost") ||
        lower.startsWith("https://127.0.0.1") ||
        lower.startsWith("https://10.0.2.2") ||
        lower.startsWith("https://0.0.0.0") ||
        lower == "https://" ||
        lower == "https://."
}

fun propOrEnv(propertyName: String, envName: String): String? {
    return project.findProperty(propertyName)?.toString()
        ?: System.getenv(envName)
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
            val releaseUrl = (propOrEnv("releaseApiUrl", "JOBTAP_RELEASE_API_BASE_URL") ?: defaultReleaseUrl)
                .also { url ->
                    if (url.isUnsafeReleaseUrl()) {
                        throw GradleException(
                            "Release API URL '$url' is unsafe. Release builds must use " +
                            "HTTPS with a valid production host (not localhost/127.0.0.1/10.0.2.2/http). " +
                            "Configure via -PreleaseApiUrl=https://your-api.com or JOBTAP_RELEASE_API_BASE_URL."
                        )
                    }
                }
            buildConfigField("String", "API_BASE_URL", "\"$releaseUrl\"")

            val releaseSigning = signingConfigs.findByName("release")
            val hasReleaseKey = releaseSigning?.storeFile?.exists() == true &&
                releaseSigning.storePassword != null &&
                releaseSigning.keyAlias != null &&
                releaseSigning.keyPassword != null
            if (hasReleaseKey) {
                signingConfig = releaseSigning
            } else {
                signingConfig = signingConfigs.getByName("debug")
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
