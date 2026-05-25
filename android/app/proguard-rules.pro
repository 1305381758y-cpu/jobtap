# JobTap ProGuard rules
# This file is intentionally minimal for the MVP.
# Add project-specific rules as needed.

-keepattributes *Annotation*
-keepclassmembers class * {
    @kotlin.Metadata <fields>;
}
