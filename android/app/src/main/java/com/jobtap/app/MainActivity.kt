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
import androidx.compose.ui.platform.LocalUriHandler
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
import com.jobtap.app.country.CountryDetector
import com.jobtap.app.data.MobileJobsRepository
import com.jobtap.app.model.Job
import com.jobtap.app.ui.JobDetailUiState
import com.jobtap.app.ui.JobListUiState
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val CalmBlue = Color(0xFF2563EB)
private val CalmBlueLight = Color(0xFFEFF6FF)
private val Ink = Color(0xFF111827)
private val Muted = Color(0xFF6B7280)
private val SoftGray = Color(0xFFF3F4F6)
private val BorderGray = Color(0xFFE5E7EB)
private val DangerRed = Color(0xFFDC2626)
private const val ApiBaseUrl = "http://10.0.2.2:3000"
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
        primary = CalmBlue,
        onPrimary = Color.White,
        background = Color(0xFFFAFAFA),
        onBackground = Ink,
        surface = Color.White,
        onSurface = Ink,
        surfaceVariant = SoftGray,
        onSurfaceVariant = Muted,
        outline = BorderGray,
        error = DangerRed
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
        AnalyticsEventFactory(deviceIdProvider, appVersion = "1.0.0")
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
            NavigationBar(containerColor = Color.White) {
                AppTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        label = { Text(stringResource(tab.labelRes)) },
                        icon = { Text(stringResource(tab.iconRes), fontSize = 18.sp) }
                    )
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
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, BorderGray),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Text(
                        text = paragraph,
                        modifier = Modifier.padding(16.dp),
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
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
        item {
            Text(
                text = stringResource(R.string.jobs_title),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Ink
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.jobs_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = Muted
            )
            Spacer(modifier = Modifier.height(4.dp))
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
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, BorderGray),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
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
private fun JobCard(job: Job, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, BorderGray),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                BadgeText(job.remoteLabel == "Remote")
                Text(
                    text = if (job.postedDate == "Posted recently") stringResource(R.string.posted_recently) else job.postedDate,
                    style = MaterialTheme.typography.labelSmall, color = Muted
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = job.title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Ink,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(job.employer, style = MaterialTheme.typography.bodyLarge, color = CalmBlue)
            Spacer(modifier = Modifier.height(14.dp))
            InfoLine(label = stringResource(R.string.label_salary), value = job.salary)
            Spacer(modifier = Modifier.height(6.dp))
            InfoLine(label = stringResource(R.string.label_time), value = job.workTime)
            Spacer(modifier = Modifier.height(6.dp))
            InfoLine(label = stringResource(R.string.label_area), value = job.location)
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
    val uriHandler = LocalUriHandler.current
    val detailUnableToOpen = stringResource(R.string.detail_unable_to_open)

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
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
                            try {
                                uriHandler.openUri(trimmedUrl)
                            } catch (_: Exception) {
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
                        .padding(16.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CalmBlue)
                ) {
                    Text(stringResource(R.string.detail_contact_button), modifier = Modifier.padding(vertical = 6.dp))
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                BadgeText(job.remoteLabel == "Remote")
                Text(
                    text = if (job.postedDate == "Posted recently") stringResource(R.string.posted_recently) else job.postedDate,
                    style = MaterialTheme.typography.labelSmall, color = Muted
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(job.title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            Text(job.employer, style = MaterialTheme.typography.titleMedium, color = CalmBlue)
            Spacer(modifier = Modifier.height(20.dp))
            DetailPanel(job)
            Spacer(modifier = Modifier.height(24.dp))
            Text(stringResource(R.string.detail_description), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Text(job.description, style = MaterialTheme.typography.bodyLarge, color = Ink)
            Spacer(modifier = Modifier.height(72.dp))
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
                shape = RoundedCornerShape(8.dp),
                border = BorderStroke(1.dp, BorderGray),
                colors = CardDefaults.cardColors(containerColor = Color.White)
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
}

@Composable
private fun DetailPanel(job: Job) {
    Card(
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, BorderGray),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            InfoLine(label = stringResource(R.string.label_salary), value = job.salary)
            HorizontalDivider(color = BorderGray)
            InfoLine(label = stringResource(R.string.label_work_time), value = job.workTime)
            HorizontalDivider(color = BorderGray)
            InfoLine(label = stringResource(R.string.label_work_mode), value = if (job.remoteLabel == "Remote") stringResource(R.string.badge_remote) else stringResource(R.string.badge_local))
        }
    }
}

@Composable
private fun SettingsScreen(
    onPrivacyClick: () -> Unit,
    onTermsClick: () -> Unit
) {
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text(stringResource(R.string.settings_title), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
        }
        item { SettingsRow(stringResource(R.string.settings_language_label), stringResource(R.string.settings_language_value)) }
        item { SettingsRow(stringResource(R.string.settings_privacy_policy), "", onClick = onPrivacyClick) }
        item { SettingsRow(stringResource(R.string.settings_terms), "", onClick = onTermsClick) }
        item { SettingsRow(stringResource(R.string.settings_app_version), "1.0.0", passive = true) }
    }
}

@Composable
private fun SettingsRow(label: String, value: String, passive: Boolean = false, onClick: (() -> Unit)? = null) {
    Card(
        modifier = if (onClick != null) Modifier.fillMaxWidth().clickable(onClick = onClick) else Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, BorderGray),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, color = Ink)
            Text(if (value.isNotEmpty()) value else if (passive) "" else ">", color = Muted)
        }
    }
}

@Composable
private fun CountryLoadingScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier
                .padding(28.dp)
                .widthIn(max = 360.dp),
            shape = RoundedCornerShape(8.dp),
            border = BorderStroke(1.dp, BorderGray),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.country_loading_title), color = CalmBlue, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(22.dp))
                CircularProgressIndicator(color = CalmBlue)
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
            shape = RoundedCornerShape(8.dp),
            border = BorderStroke(1.dp, BorderGray),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.country_loading_title), color = CalmBlue, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(22.dp))
                Text(stringResource(R.string.country_failure_title), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    stringResource(R.string.country_failure_body),
                    color = Muted,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(onClick = onRetry, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.country_retry))
                }
            }
        }
    }
}

@Composable
private fun EmptyPanel(title: String, body: String) {
    Card(
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, BorderGray),
        colors = CardDefaults.cardColors(containerColor = Color.White)
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
        color = if (isRemote) CalmBlueLight else SoftGray,
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = if (isRemote) stringResource(R.string.badge_remote) else stringResource(R.string.badge_local),
            color = if (isRemote) CalmBlue else Muted,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
        )
    }
}
