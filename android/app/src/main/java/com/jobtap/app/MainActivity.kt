package com.jobtap.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jobtap.app.analytics.AnalyticsEventFactory
import com.jobtap.app.analytics.DeviceIdProvider
import com.jobtap.app.analytics.SharedPreferencesDeviceIdStore
import com.jobtap.app.api.HttpUrlConnectionApiTransport
import com.jobtap.app.api.MobileApiClient
import com.jobtap.app.contact.ContactLinkValidator
import com.jobtap.app.contact.ExternalLinkOpener
import com.jobtap.app.country.CountryDetector
import com.jobtap.app.data.MobileJobsRepository
import com.jobtap.app.model.Job
import com.jobtap.app.ui.JobDetailUiState
import com.jobtap.app.ui.JobListUiState
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val DeepIndigo = Color(0xFF3730A3)
private val ElectricBlue = Color(0xFF6366F1)
private val IndigoSoft = Color(0xFFEEF2FF)
private val Midnight = Color(0xFF0F172A)
private val Slate = Color(0xFF64748B)
private val SoftSlate = Color(0xFFF8FAFC)
private val BorderGray = Color(0xFFE2E8F0)
private val Emerald = Color(0xFF10B981)
private val EmeraldSoft = Color(0xFFECFDF5)
private val Rose = Color(0xFFF43F5E)
private val WarmSurface = Color(0xFFFFFBF7)
private val CalmBlue = DeepIndigo
private val CalmBlueLight = IndigoSoft
private val Ink = Midnight
private val Muted = Slate
private val SoftGray = SoftSlate
private val DangerRed = Rose
private val ApiBaseUrl = BuildConfig.API_BASE_URL
private const val JobsPageSize = 20

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            JobTapTheme {
                JobTapApp()
            }
        }
    }
}

@Composable
private fun JobTapTheme(content: @Composable () -> Unit) {
    val colors = lightColorScheme(
        primary = DeepIndigo,
        onPrimary = Color.White,
        background = SoftSlate,
        onBackground = Midnight,
        surface = Color.White,
        onSurface = Midnight,
        surfaceVariant = IndigoSoft,
        onSurfaceVariant = Slate,
        outline = BorderGray,
        error = Rose
    )

    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}

private enum class CountryState {
    Loading, Detected, Failure
}

@Composable
private fun JobTapApp() {
    var selectedTab by remember { mutableStateOf(AppTab.Jobs) }
    var selectedJobId by remember { mutableStateOf<String?>(null) }
    var detectedCountryCode by remember { mutableStateOf<String?>(null) }
    var countryState by remember { mutableStateOf(CountryState.Loading) }
    var legalDoc by remember { mutableStateOf<LegalDocType?>(null) }

    val context = LocalContext.current.applicationContext
    val locale = remember { Locale.getDefault().toLanguageTag() }
    val analyticsFactory = remember {
        val deviceIdStore = SharedPreferencesDeviceIdStore(context)
        val deviceIdProvider = DeviceIdProvider(deviceIdStore) { java.util.UUID.randomUUID().toString() }
        AnalyticsEventFactory(deviceIdProvider, appVersion = BuildConfig.VERSION_NAME)
    }

    val apiClient = remember {
        MobileApiClient(ApiBaseUrl, HttpUrlConnectionApiTransport())
    }
    val repository = remember {
        MobileJobsRepository(apiClient)
    }

    var jobListState by remember { mutableStateOf<JobListUiState>(JobListUiState.Loading) }
    var reloadToken by remember { mutableStateOf(0) }
    var isRefreshing by remember { mutableStateOf(false) }
    var appOpenSent by remember { mutableStateOf(false) }
    var jobDetailState by remember { mutableStateOf<JobDetailUiState>(JobDetailUiState.Idle) }
    var detailReloadToken by remember { mutableStateOf(0) }
    val appScope = rememberCoroutineScope()

    // Pre-capture string resources for use in lambdas
    val jobsErrorRefresh = stringResource(R.string.jobs_error_refresh)
    val detailErrorText = stringResource(R.string.detail_error)
    val jobsErrorLoad = stringResource(R.string.jobs_error_load)
    val jobsErrorLoadMore = stringResource(R.string.jobs_error_load_more)

    // Bootstrap country detection: call backend, fall back to locale
    LaunchedEffect(Unit) {
        countryState = CountryState.Loading
        val localeCountry = CountryDetector.detectFromLocale(Locale.getDefault())
        val result = withContext(Dispatchers.IO) {
            repository.bootstrap(localeCountry)
        }
        result.fold(
            onSuccess = { response ->
                val backendCountry = response.countryCode
                if (backendCountry != null) {
                    detectedCountryCode = backendCountry
                    countryState = CountryState.Detected
                } else if (localeCountry != null) {
                    detectedCountryCode = localeCountry
                    countryState = CountryState.Detected
                } else {
                    detectedCountryCode = null
                    countryState = CountryState.Failure
                }
            },
            onFailure = {
                // Bootstrap failed, fall back to locale
                if (localeCountry != null) {
                    detectedCountryCode = localeCountry
                    countryState = CountryState.Detected
                } else {
                    detectedCountryCode = null
                    countryState = CountryState.Failure
                }
            }
        )
    }

    val onRefresh: () -> Unit = onRefresh@{
        val countryCode = detectedCountryCode
        if (isRefreshing || countryCode == null) return@onRefresh
        isRefreshing = true
        appScope.launch {
            val result = withContext(Dispatchers.IO) {
                repository.listJobs(countryCode, 1)
            }
            result.fold(
                onSuccess = { jobs ->
                    jobListState = JobListUiState.Success(jobs, canLoadMore = jobs.size >= JobsPageSize)
                },
                onFailure = {
                    val currentState = jobListState
                    jobListState = if (currentState !is JobListUiState.Success) {
                        JobListUiState.Error(jobsErrorRefresh)
                    } else {
                        currentState
                    }
                }
            )
            isRefreshing = false
        }
    }

    // Send app_open once after country is detected
    LaunchedEffect(detectedCountryCode) {
        val countryCode = detectedCountryCode ?: return@LaunchedEffect
        if (!appOpenSent) {
            appOpenSent = true
            val event = analyticsFactory.appOpen(countryCode, locale)
            launch(Dispatchers.IO) {
                repository.trackAnalytics(event)
            }
        }
    }

    // Fetch job detail from backend whenever selection, country, or reload token changes
    LaunchedEffect(selectedJobId, detectedCountryCode, detailReloadToken) {
        val jobId = selectedJobId ?: run { jobDetailState = JobDetailUiState.Idle; return@LaunchedEffect }
        val countryCode = detectedCountryCode ?: return@LaunchedEffect
        jobDetailState = JobDetailUiState.Loading(jobId)
        val result = withContext(Dispatchers.IO) {
            repository.getJob(jobId, countryCode)
        }
        result.fold(
            onSuccess = { job -> jobDetailState = JobDetailUiState.Loaded(job) },
            onFailure = { jobDetailState = JobDetailUiState.Error(jobId, detailErrorText) }
        )
    }

    // Detail screen rendering — driven by job detail state
    selectedJobId?.let { jobId ->
        when (val state = jobDetailState) {
            is JobDetailUiState.Loaded -> {
                if (state.job.id == jobId) {
                    LaunchedEffect(jobId, detectedCountryCode) {
                        val countryCode = detectedCountryCode ?: return@LaunchedEffect
                        withContext(Dispatchers.IO) {
                            repository.trackAnalytics(analyticsFactory.jobDetailView(countryCode, locale, jobId))
                        }
                    }
                    JobDetailScreen(
                        job = state.job,
                        onBack = { selectedJobId = null; jobDetailState = JobDetailUiState.Idle },
                        onContactClick = { job ->
                            val countryCode = detectedCountryCode
                            if (countryCode != null) {
                                appScope.launch(Dispatchers.IO) {
                                    repository.trackAnalytics(analyticsFactory.contactClick(countryCode, locale, job.id))
                                }
                            }
                        }
                    )
                    return
                }
            }
            is JobDetailUiState.Error -> {
                if (state.jobId == jobId) {
                    JobDetailErrorScreen(
                        message = state.message,
                        onBack = { selectedJobId = null; jobDetailState = JobDetailUiState.Idle },
                        onRetry = { detailReloadToken++ }
                    )
                    return
                }
            }
            else -> { /* Loading, Idle, or mismatched state */ }
        }
        // Fallback: still loading, idle, or state doesn't match current selection
        JobDetailLoadingScreen(onBack = { selectedJobId = null; jobDetailState = JobDetailUiState.Idle })
        return
    }

    when (countryState) {
        CountryState.Loading -> {
            CountryLoadingScreen()
            return
        }
        CountryState.Failure -> {
            CountryFailureScreen(onRetry = {
                val localeCountry = CountryDetector.detectFromLocale(Locale.getDefault())
                countryState = CountryState.Loading
                appScope.launch {
                    val result = withContext(Dispatchers.IO) {
                        repository.bootstrap(localeCountry)
                    }
                    result.fold(
                        onSuccess = { response ->
                            val backendCountry = response.countryCode
                            if (backendCountry != null) {
                                detectedCountryCode = backendCountry
                                countryState = CountryState.Detected
                            } else if (localeCountry != null) {
                                detectedCountryCode = localeCountry
                                countryState = CountryState.Detected
                            } else {
                                countryState = CountryState.Failure
                            }
                        },
                        onFailure = {
                            if (localeCountry != null) {
                                detectedCountryCode = localeCountry
                                countryState = CountryState.Detected
                            } else {
                                countryState = CountryState.Failure
                            }
                        }
                    )
                }
            })
            return
        }
        CountryState.Detected -> { /* Continue to normal app */ }
    }

    // Load jobs whenever country or reload token changes
    LaunchedEffect(detectedCountryCode, reloadToken) {
        val countryCode = detectedCountryCode ?: return@LaunchedEffect
        jobListState = JobListUiState.Loading
        val result = withContext(Dispatchers.IO) {
            val r = repository.listJobs(countryCode, 1)
            repository.trackAnalytics(analyticsFactory.jobListView(countryCode, locale))
            r
        }
        result.fold(
            onSuccess = { jobs -> jobListState = JobListUiState.Success(jobs, canLoadMore = jobs.size >= JobsPageSize) },
            onFailure = { jobListState = JobListUiState.Error(jobsErrorLoad) }
        )
    }

    // Clear stale selection when the selected job is no longer in the loaded list
    LaunchedEffect(selectedJobId, jobListState) {
        val jobId = selectedJobId ?: return@LaunchedEffect
        val jobs = (jobListState as? JobListUiState.Success)?.jobs ?: return@LaunchedEffect
        if (jobs.none { it.id == jobId }) {
            selectedJobId = null
            jobDetailState = JobDetailUiState.Idle
        }
    }

    Scaffold(
        bottomBar = {
            Surface(color = Color.White, shadowElevation = 10.dp) {
                NavigationBar(containerColor = Color.White) {
                    AppTab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = selectedTab == tab,
                            onClick = { selectedTab = tab },
                            label = { Text(stringResource(tab.labelRes), fontWeight = FontWeight.SemiBold) },
                            icon = {
                                NavGlyph(
                                    label = stringResource(tab.iconRes),
                                    selected = selectedTab == tab
                                )
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            color = MaterialTheme.colorScheme.background
        ) {
            val docType = legalDoc
            if (docType != null) {
                val title = when (docType) {
                    LegalDocType.TermsOfService -> stringResource(R.string.legal_terms_title)
                    LegalDocType.PrivacyPolicy -> stringResource(R.string.legal_privacy_title)
                }
                val paragraphs = when (docType) {
                    LegalDocType.TermsOfService -> termsParagraphs()
                    LegalDocType.PrivacyPolicy -> privacyParagraphs()
                }
                LegalDocumentScreen(
                    title = title,
                    paragraphs = paragraphs,
                    onBack = { legalDoc = null }
                )
            } else {
                when (selectedTab) {
                    AppTab.Jobs -> JobsScreen(
                        state = jobListState,
                        countryCode = detectedCountryCode,
                        isRefreshing = isRefreshing,
                        onRefresh = onRefresh,
                        onRetry = { reloadToken++ },
                        onLoadMore = {
                            appScope.launch {
                                val countryCode = detectedCountryCode ?: return@launch
                                val current = jobListState as? JobListUiState.Success ?: return@launch
                                if (!current.canLoadMore || current.isLoadingMore) return@launch
                                val nextPage = current.nextPage
                                jobListState = current.startLoadingMore()
                                val result = withContext(Dispatchers.IO) {
                                    repository.listJobs(countryCode, nextPage)
                                }
                                result.fold(
                                    onSuccess = { newJobs ->
                                        val latest = jobListState as? JobListUiState.Success ?: return@fold
                                        jobListState = latest.appendPage(newJobs, JobsPageSize)
                                    },
                                    onFailure = {
                                        val latest = jobListState as? JobListUiState.Success ?: return@fold
                                        jobListState = latest.failLoadingMore(jobsErrorLoadMore)
                                    }
                                )
                            }
                        },
                        onJobClick = { selectedJobId = it }
                    )
                    AppTab.Settings -> SettingsScreen(
                        onPrivacyClick = { legalDoc = LegalDocType.PrivacyPolicy },
                        onTermsClick = { legalDoc = LegalDocType.TermsOfService }
                    )
                }
            }
        }
    }
}

private enum class AppTab(val labelRes: Int, val iconRes: Int) {
    Jobs(R.string.tab_jobs, R.string.tab_jobs_icon),
    Settings(R.string.tab_settings, R.string.tab_settings_icon)
}

private enum class LegalDocType { TermsOfService, PrivacyPolicy }

@Composable
private fun NavGlyph(label: String, selected: Boolean) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = if (selected) IndigoSoft else Color.Transparent
    ) {
        Text(
            text = label,
            color = if (selected) DeepIndigo else Slate,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 12.sp,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun termsParagraphs(): List<String> = listOf(
    stringResource(R.string.terms_para_1),
    stringResource(R.string.terms_para_2),
    stringResource(R.string.terms_para_3),
    stringResource(R.string.terms_para_4)
)

@Composable
private fun privacyParagraphs(): List<String> = listOf(
    stringResource(R.string.privacy_para_1),
    stringResource(R.string.privacy_para_2),
    stringResource(R.string.privacy_para_3),
    stringResource(R.string.privacy_para_4),
    stringResource(R.string.privacy_para_5),
    stringResource(R.string.privacy_para_6)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LegalDocumentScreen(title: String, paragraphs: List<String>, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text(stringResource(R.string.legal_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            paragraphs.forEach { paragraph ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(22.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                ) {
                    Text(
                        text = paragraph,
                        modifier = Modifier.padding(18.dp),
                        color = Ink,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
private fun JobsScreen(
    state: JobListUiState,
    countryCode: String?,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onLoadMore: () -> Unit,
    onJobClick: (String) -> Unit
) {
    val pullRefreshState = rememberPullRefreshState(isRefreshing, onRefresh)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pullRefresh(pullRefreshState)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 18.dp, vertical = 22.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
        item {
            JobsHeader(countryCode = countryCode)
        }

        when (state) {
            is JobListUiState.Loading -> {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(stringResource(R.string.jobs_loading))
                    }
                }
            }
            is JobListUiState.Error -> {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(22.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                state.message,
                                color = Muted,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(18.dp))
                            Button(
                                onClick = onRetry,
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(stringResource(R.string.jobs_retry))
                            }
                        }
                    }
                }
            }
            is JobListUiState.Success -> {
                if (state.isEmpty) {
                    item {
                        EmptyPanel(
                            stringResource(R.string.jobs_empty_title),
                            stringResource(R.string.jobs_empty_body)
                        )
                    }
                } else {
                    items(state.jobs, key = { it.id }) { job ->
                        JobCard(job = job, onClick = { onJobClick(job.id) })
                    }
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            val loadMoreError = state.loadMoreError
                            if (loadMoreError != null) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = loadMoreError,
                                        color = DangerRed,
                                        style = MaterialTheme.typography.bodyMedium,
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    OutlinedButton(onClick = onLoadMore) {
                                        Text(stringResource(R.string.jobs_retry))
                                    }
                                }
                            } else if (state.isLoadingMore) {
                                Text(stringResource(R.string.jobs_loading_more), color = Muted)
                            } else if (state.canLoadMore) {
                                OutlinedButton(
                                    onClick = onLoadMore,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(stringResource(R.string.jobs_load_more))
                                }
                            } else {
                                Text(
                                    text = stringResource(R.string.jobs_no_more),
                                    color = Muted,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                    }
                }
            }
        }
        }
        PullRefreshIndicator(
            refreshing = isRefreshing,
            state = pullRefreshState,
            modifier = Modifier.align(Alignment.TopCenter)
        )
    }
}

@Composable
private fun JobsHeader(countryCode: String?) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.jobs_title),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = Midnight
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = stringResource(R.string.jobs_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Slate
                )
            }
            if (countryCode != null) {
                ReadOnlyCountryChip(countryCode)
            }
        }
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            color = IndigoSoft
        ) {
            Text(
                text = stringResource(R.string.jobs_country_auto_note),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                color = DeepIndigo,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun ReadOnlyCountryChip(countryCode: String) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = Color.White,
        border = BorderStroke(1.dp, BorderGray),
        shadowElevation = 2.dp
    ) {
        Text(
            text = countryCode,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            color = DeepIndigo,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun JobCard(job: Job, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = job.employer.uppercase(Locale.US),
                    style = MaterialTheme.typography.labelMedium,
                    color = ElectricBlue,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = if (job.postedDate == "Posted recently") stringResource(R.string.posted_recently) else job.postedDate,
                    style = MaterialTheme.typography.labelSmall, color = Muted
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = job.title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.ExtraBold,
                color = Ink,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(16.dp))
            BadgeText(job.remoteLabel == "Remote")
            Spacer(modifier = Modifier.height(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                MetaChip(label = stringResource(R.string.label_salary), value = job.salary)
                MetaChip(label = stringResource(R.string.label_time), value = job.workTime)
                MetaChip(label = stringResource(R.string.label_area), value = job.location)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JobDetailScreen(
    job: Job,
    onBack: () -> Unit,
    onContactClick: (Job) -> Unit
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val detailUnableToOpen = stringResource(R.string.detail_unable_to_open)

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.detail_title), color = Midnight, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text(stringResource(R.string.legal_back), color = DeepIndigo, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SoftSlate)
            )
        },
        bottomBar = {
            Surface(color = Color.White, shadowElevation = 8.dp) {
                Button(
                    onClick = {
                        onContactClick(job)
                        val trimmedUrl = job.contactUrl.trim()
                        if (!ContactLinkValidator.isValid(trimmedUrl)) {
                            scope.launch {
                                snackbarHostState.showSnackbar(
                                    message = detailUnableToOpen,
                                    duration = SnackbarDuration.Short
                                )
                            }
                        } else {
                            val error = ExternalLinkOpener.open(context, trimmedUrl)
                            if (error != null) {
                                scope.launch {
                                    snackbarHostState.showSnackbar(
                                        message = detailUnableToOpen,
                                        duration = SnackbarDuration.Short
                                    )
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 14.dp),
                    shape = RoundedCornerShape(18.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DeepIndigo),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                ) {
                    Text(
                        stringResource(R.string.detail_contact_button),
                        modifier = Modifier.padding(vertical = 8.dp),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(18.dp)
        ) {
            JobDetailHero(job)
            Spacer(modifier = Modifier.height(18.dp))
            DetailPanel(job)
            Spacer(modifier = Modifier.height(24.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        stringResource(R.string.detail_description),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = Midnight
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(job.description, style = MaterialTheme.typography.bodyLarge, color = Ink)
                }
            }
            Spacer(modifier = Modifier.height(72.dp))
        }
    }
}

@Composable
private fun JobDetailHero(job: Job) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        color = DeepIndigo,
        shadowElevation = 6.dp
    ) {
        Column(modifier = Modifier.padding(22.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                BadgeText(job.remoteLabel == "Remote")
                Text(
                    text = if (job.postedDate == "Posted recently") stringResource(R.string.posted_recently) else job.postedDate,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.78f)
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            Text(
                job.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                job.employer,
                style = MaterialTheme.typography.titleMedium,
                color = Color.White.copy(alpha = 0.86f),
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JobDetailLoadingScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.detail_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text(stringResource(R.string.legal_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.Center
        ) {
            Text(stringResource(R.string.detail_loading))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JobDetailErrorScreen(message: String, onBack: () -> Unit, onRetry: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.detail_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text(stringResource(R.string.legal_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.Center
        ) {
                Card(
                    modifier = Modifier
                        .padding(28.dp)
                        .widthIn(max = 360.dp),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier.padding(22.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = message,
                        color = Muted,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(18.dp))
                    Button(onClick = onRetry, shape = RoundedCornerShape(16.dp)) {
                        Text(stringResource(R.string.jobs_retry))
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailPanel(job: Job) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            MetaChip(label = stringResource(R.string.label_salary), value = job.salary)
            MetaChip(label = stringResource(R.string.label_work_time), value = job.workTime)
            MetaChip(label = stringResource(R.string.label_work_mode), value = if (job.remoteLabel == "Remote") stringResource(R.string.badge_remote) else stringResource(R.string.badge_local))
        }
    }
}

@Composable
private fun SettingsScreen(
    onPrivacyClick: () -> Unit,
    onTermsClick: () -> Unit
) {
    LazyColumn(contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item {
            Text(
                stringResource(R.string.settings_title),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
                color = Midnight
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(stringResource(R.string.jobs_subtitle), color = Slate, style = MaterialTheme.typography.bodyMedium)
        }
        item {
            SettingsGroup {
                SettingsRow(stringResource(R.string.settings_language_label), stringResource(R.string.settings_language_value))
                HorizontalDivider(color = BorderGray)
                SettingsRow(stringResource(R.string.settings_privacy_policy), "", onClick = onPrivacyClick)
                HorizontalDivider(color = BorderGray)
                SettingsRow(stringResource(R.string.settings_terms), "", onClick = onTermsClick)
            }
        }
        item {
            SettingsGroup {
                SettingsRow(stringResource(R.string.settings_app_version), "1.0.0", passive = true)
            }
        }
    }
}

@Composable
private fun SettingsGroup(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column { content() }
    }
}

@Composable
private fun SettingsRow(label: String, value: String, passive: Boolean = false, onClick: (() -> Unit)? = null) {
    Row(
        modifier = (if (onClick != null) Modifier.fillMaxWidth().clickable(onClick = onClick) else Modifier.fillMaxWidth())
            .padding(horizontal = 18.dp, vertical = 18.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = Ink, fontWeight = FontWeight.SemiBold)
        Text(if (value.isNotEmpty()) value else if (passive) "" else ">", color = Muted)
    }
}

@Composable
private fun CountryLoadingScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier
                .padding(28.dp)
                .widthIn(max = 360.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.country_loading_title), color = DeepIndigo, fontWeight = FontWeight.ExtraBold)
                Spacer(modifier = Modifier.height(22.dp))
                CircularProgressIndicator(color = ElectricBlue)
                Spacer(modifier = Modifier.height(16.dp))
                Text(stringResource(R.string.country_loading_message), color = Muted, textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun CountryFailureScreen(onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier
                .padding(28.dp)
                .widthIn(max = 360.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.country_loading_title), color = DeepIndigo, fontWeight = FontWeight.ExtraBold)
                Spacer(modifier = Modifier.height(22.dp))
                Text(stringResource(R.string.country_failure_title), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    stringResource(R.string.country_failure_body),
                    color = Muted,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(onClick = onRetry, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.country_retry))
                }
            }
        }
    }
}

@Composable
private fun EmptyPanel(title: String, body: String) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            Text(body, color = Muted, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun InfoLine(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = Muted)
        Text(value, color = Ink, fontWeight = FontWeight.Medium, textAlign = TextAlign.End)
    }
}

@Composable
private fun BadgeText(isRemote: Boolean) {
    Surface(
        color = if (isRemote) EmeraldSoft else SoftGray,
        shape = RoundedCornerShape(999.dp)
    ) {
        Text(
            text = if (isRemote) stringResource(R.string.badge_remote) else stringResource(R.string.badge_local),
            color = if (isRemote) Color(0xFF047857) else Muted,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
        )
    }
}

@Composable
private fun MetaChip(label: String, value: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SoftSlate,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, BorderGray)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, color = Slate, style = MaterialTheme.typography.labelMedium)
            Text(
                value,
                color = Midnight,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.End,
                modifier = Modifier.padding(start = 12.dp)
            )
        }
    }
}
