package com.jobtap.app.analytics

import com.jobtap.app.api.AnalyticsEventDto
import com.jobtap.app.api.AnalyticsEventType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AnalyticsEventFactoryTest {

    // -------------------------------------------- fakes

    private class FakeDeviceIdStore(
        var storedId: String? = "test-device-001"
    ) : DeviceIdStore {
        override fun readDeviceId(): String? = storedId
        override fun writeDeviceId(deviceId: String) { storedId = deviceId }
    }

    private fun factoryWithId(deviceId: String = "test-device-001"): AnalyticsEventFactory {
        val store = FakeDeviceIdStore(storedId = deviceId)
        val provider = DeviceIdProvider(store) { error("unexpected") }
        return AnalyticsEventFactory(provider, appVersion = "1.0.0")
    }

    // -------------------------------------------- appOpen

    @Test
    fun `appOpen sets APP_OPEN event type and sourceScreen app`() {
        val factory = factoryWithId("d-1")

        val event = factory.appOpen(countryCode = "US", locale = "en-US")

        assertEquals(AnalyticsEventType.APP_OPEN, event.eventType)
        assertEquals("app", event.sourceScreen)
    }

    @Test
    fun `appOpen sets platform android and appVersion`() {
        val factory = factoryWithId("d-1")

        val event = factory.appOpen(countryCode = "US", locale = "en-US")

        assertEquals("android", event.platform)
        assertEquals("1.0.0", event.appVersion)
    }

    @Test
    fun `appOpen sets countryCode and locale`() {
        val factory = factoryWithId("d-1")

        val event = factory.appOpen(countryCode = "JP", locale = "ja-JP")

        assertEquals("JP", event.countryCode)
        assertEquals("ja-JP", event.locale)
    }

    @Test
    fun `appOpen uses device id from provider`() {
        val factory = factoryWithId("custom-device")

        val event = factory.appOpen(countryCode = "US", locale = "en-US")

        assertEquals("custom-device", event.deviceId)
    }

    @Test
    fun `appOpen has no jobId`() {
        val factory = factoryWithId("d-1")

        val event = factory.appOpen(countryCode = "US", locale = "en-US")

        assertNull("appOpen should not set jobId", event.jobId)
    }

    // -------------------------------------------- jobListView

    @Test
    fun `jobListView sets JOB_LIST_VIEW event type and sourceScreen jobs`() {
        val factory = factoryWithId("d-1")

        val event = factory.jobListView(countryCode = "DE", locale = "de-DE")

        assertEquals(AnalyticsEventType.JOB_LIST_VIEW, event.eventType)
        assertEquals("jobs", event.sourceScreen)
    }

    @Test
    fun `jobListView sets platform android and appVersion`() {
        val factory = factoryWithId("d-2")

        val event = factory.jobListView(countryCode = "DE", locale = "de-DE")

        assertEquals("android", event.platform)
        assertEquals("1.0.0", event.appVersion)
    }

    @Test
    fun `jobListView sets countryCode and locale`() {
        val factory = factoryWithId("d-1")

        val event = factory.jobListView(countryCode = "FR", locale = "fr-FR")

        assertEquals("FR", event.countryCode)
        assertEquals("fr-FR", event.locale)
    }

    @Test
    fun `jobListView uses device id from provider`() {
        val factory = factoryWithId("device-list")

        val event = factory.jobListView(countryCode = "US", locale = "en")

        assertEquals("device-list", event.deviceId)
    }

    @Test
    fun `jobListView has no jobId`() {
        val factory = factoryWithId("d-1")

        val event = factory.jobListView(countryCode = "US", locale = "en-US")

        assertNull("jobListView should not set jobId", event.jobId)
    }

    // -------------------------------------------- jobDetailView

    @Test
    fun `jobDetailView sets JOB_DETAIL_VIEW event type and sourceScreen job_detail`() {
        val factory = factoryWithId("d-1")

        val event = factory.jobDetailView(countryCode = "US", locale = "en-US", jobId = "job-42")

        assertEquals(AnalyticsEventType.JOB_DETAIL_VIEW, event.eventType)
        assertEquals("job_detail", event.sourceScreen)
    }

    @Test
    fun `jobDetailView sets platform android and appVersion`() {
        val factory = factoryWithId("d-1")

        val event = factory.jobDetailView(countryCode = "US", locale = "en-US", jobId = "job-42")

        assertEquals("android", event.platform)
        assertEquals("1.0.0", event.appVersion)
    }

    @Test
    fun `jobDetailView sets countryCode locale and jobId`() {
        val factory = factoryWithId("d-1")

        val event = factory.jobDetailView(countryCode = "CA", locale = "en-CA", jobId = "job-99")

        assertEquals("CA", event.countryCode)
        assertEquals("en-CA", event.locale)
        assertEquals("job-99", event.jobId)
    }

    @Test
    fun `jobDetailView uses device id from provider`() {
        val factory = factoryWithId("device-detail")

        val event = factory.jobDetailView(countryCode = "US", locale = "en", jobId = "x")

        assertEquals("device-detail", event.deviceId)
    }

    // -------------------------------------------- contactClick

    @Test
    fun `contactClick sets CONTACT_CLICK event type and sourceScreen job_detail`() {
        val factory = factoryWithId("d-1")

        val event = factory.contactClick(countryCode = "US", locale = "en-US", jobId = "job-42")

        assertEquals(AnalyticsEventType.CONTACT_CLICK, event.eventType)
        assertEquals("job_detail", event.sourceScreen)
    }

    @Test
    fun `contactClick sets platform android and appVersion`() {
        val factory = factoryWithId("d-1")

        val event = factory.contactClick(countryCode = "US", locale = "en-US", jobId = "job-42")

        assertEquals("android", event.platform)
        assertEquals("1.0.0", event.appVersion)
    }

    @Test
    fun `contactClick sets countryCode locale and jobId`() {
        val factory = factoryWithId("d-1")

        val event = factory.contactClick(countryCode = "MX", locale = "es-MX", jobId = "job-77")

        assertEquals("MX", event.countryCode)
        assertEquals("es-MX", event.locale)
        assertEquals("job-77", event.jobId)
    }

    @Test
    fun `contactClick uses device id from provider`() {
        val factory = factoryWithId("device-contact")

        val event = factory.contactClick(countryCode = "US", locale = "en", jobId = "y")

        assertEquals("device-contact", event.deviceId)
    }

    // -------------------------------------------- reuse provider id across events

    @Test
    fun `all event types reuse the same device id from provider`() {
        // Use a mutable backing so all calls return the same id
        val store = FakeDeviceIdStore(storedId = "shared-device")
        val provider = DeviceIdProvider(store) { error("unexpected") }
        val factory = AnalyticsEventFactory(provider, appVersion = "2.0.0")

        val appOpen = factory.appOpen("US", "en")
        val listView = factory.jobListView("US", "en")
        val detailView = factory.jobDetailView("US", "en", "j-1")
        val contact = factory.contactClick("US", "en", "j-2")

        assertEquals("shared-device", appOpen.deviceId)
        assertEquals("shared-device", listView.deviceId)
        assertEquals("shared-device", detailView.deviceId)
        assertEquals("shared-device", contact.deviceId)
    }
}
