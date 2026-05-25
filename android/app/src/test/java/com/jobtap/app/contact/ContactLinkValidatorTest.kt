package com.jobtap.app.contact

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ContactLinkValidatorTest {

    @Test
    fun `http URL is valid`() {
        assertTrue(ContactLinkValidator.isValid("http://example.com"))
    }

    @Test
    fun `https URL is valid`() {
        assertTrue(ContactLinkValidator.isValid("https://example.com"))
    }

    @Test
    fun `mailto link is valid`() {
        assertTrue(ContactLinkValidator.isValid("mailto:hr@example.com"))
    }

    @Test
    fun `tel link is valid`() {
        assertTrue(ContactLinkValidator.isValid("tel:+1234567890"))
    }

    @Test
    fun `http URL with leading whitespace is valid`() {
        assertTrue(ContactLinkValidator.isValid("  https://example.com"))
    }

    @Test
    fun `http URL with trailing whitespace is valid`() {
        assertTrue(ContactLinkValidator.isValid("https://example.com  "))
    }

    @Test
    fun `http URL with surrounding whitespace is valid`() {
        assertTrue(ContactLinkValidator.isValid("  https://example.com  "))
    }

    @Test
    fun `empty string is invalid`() {
        assertFalse(ContactLinkValidator.isValid(""))
    }

    @Test
    fun `whitespace only is invalid`() {
        assertFalse(ContactLinkValidator.isValid("   "))
    }

    @Test
    fun `null is invalid`() {
        assertFalse(ContactLinkValidator.isValid(null))
    }

    @Test
    fun `URL without scheme is invalid`() {
        assertFalse(ContactLinkValidator.isValid("example.com"))
    }

    @Test
    fun `empty scheme with protocol separator is invalid`() {
        assertFalse(ContactLinkValidator.isValid("://example.com"))
    }

    @Test
    fun `just a scheme word with no colon is invalid`() {
        assertFalse(ContactLinkValidator.isValid("http"))
    }

    @Test
    fun `ftp URL is invalid`() {
        assertFalse(ContactLinkValidator.isValid("ftp://files.example.com"))
    }

    @Test
    fun `javascript URL is invalid`() {
        assertFalse(ContactLinkValidator.isValid("javascript:void(0)"))
    }

    @Test
    fun `vbscript URL is invalid`() {
        assertFalse(ContactLinkValidator.isValid("vbscript:msgbox('xss')"))
    }

    @Test
    fun `file URL is invalid`() {
        assertFalse(ContactLinkValidator.isValid("file:///tmp/foo"))
    }

    @Test
    fun `sms link is valid`() {
        assertTrue(ContactLinkValidator.isValid("sms:+1234567890"))
    }

    @Test
    fun `custom app deep link is valid`() {
        assertTrue(ContactLinkValidator.isValid("whatsapp://send?phone=123"))
    }

    @Test
    fun `whatsapp deep link is valid`() {
        assertTrue(ContactLinkValidator.isValid("whatsapp://send?phone=+15551234567"))
    }

    @Test
    fun `telegram deep link is valid`() {
        assertTrue(ContactLinkValidator.isValid("tg://resolve?domain=jobtap"))
    }

    @Test
    fun `telegram https link is valid`() {
        assertTrue(ContactLinkValidator.isValid("https://t.me/jobtap"))
    }

    @Test
    fun `data URL is invalid`() {
        assertFalse(ContactLinkValidator.isValid("data:text/html,Hello"))
    }

    @Test
    fun `content URI is invalid`() {
        assertFalse(ContactLinkValidator.isValid("content://com.android.contacts/data/phones"))
    }

    @Test
    fun `about URL is invalid`() {
        assertFalse(ContactLinkValidator.isValid("about:blank"))
    }

    @Test
    fun `http scheme only with no host is invalid`() {
        assertFalse(ContactLinkValidator.isValid("http:"))
    }

    @Test
    fun `https with triple slash missing host is invalid`() {
        assertFalse(ContactLinkValidator.isValid("https:///missing-host"))
    }

    @Test
    fun `mailto scheme with no address is invalid`() {
        assertFalse(ContactLinkValidator.isValid("mailto:"))
    }

    @Test
    fun `tel scheme with no number is invalid`() {
        assertFalse(ContactLinkValidator.isValid("tel:"))
    }

    @Test
    fun `URL with space in host is invalid`() {
        assertFalse(ContactLinkValidator.isValid("http://exa mple.com"))
    }
}
