package com.jobtap.app.country

import java.util.Locale

object CountryDetector {

    fun detectFromLocale(locale: Locale): String? {
        val country = locale.country
        return if (country.length == 2 && country.all { it in 'A'..'Z' || it in 'a'..'z' }) country.uppercase(Locale.US) else null
    }
}
