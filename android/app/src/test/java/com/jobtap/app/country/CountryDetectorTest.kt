package com.jobtap.app.country

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.util.Locale

class CountryDetectorTest {

    @Test
    fun `locale US returns US`() {
        assertEquals("US", CountryDetector.detectFromLocale(Locale.US))
    }

    @Test
    fun `locale en_GB returns GB`() {
        assertEquals("GB", CountryDetector.detectFromLocale(Locale("en", "gb")))
    }

    @Test
    fun `locale ROOT returns null`() {
        assertNull(CountryDetector.detectFromLocale(Locale.ROOT))
    }

    @Test
    fun `locale en_USA returns null`() {
        assertNull(CountryDetector.detectFromLocale(Locale("en", "usa")))
    }

    @Test
    fun `locale en 1 exclamation returns null`() {
        assertNull(CountryDetector.detectFromLocale(Locale("en", "1!")))
    }

    @Test
    fun `locale with non ASCII letters returns null`() {
        assertNull(CountryDetector.detectFromLocale(Locale("en", "\u00E5\u00F8")))
    }
}
