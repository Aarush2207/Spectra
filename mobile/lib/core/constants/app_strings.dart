class AppStrings {
  AppStrings._();

  // App identity
  static const String appName = 'SPECTRA';
  static const String tagline = 'See Beyond the Message.\nDetect the Hidden Threat.';
  static const String taglineShort = 'Your intelligent digital safety companion.';
  static const String greeting = 'Stay Safe, Stay Aware.';

  // Onboarding
  static const List<String> onboardingTitles = [
    'Detect Scams',
    'Smart Screenshot Analysis',
    'Stay Protected',
  ];
  static const List<String> onboardingSubtitles = [
    'Identify suspicious messages and phishing attempts before they harm you.',
    'Extract message text from screenshots using intelligent OCR technology.',
    'Understand risk levels and receive actionable safety recommendations.',
  ];

  // Navigation
  static const String navHome = 'Home';
  static const String navAnalytics = 'Graphs';
  static const String navHistory = 'History';
  static const String navProfile = 'Profile';

  // Home
  static const String analyzeCard = 'Analyze a Suspicious Message';
  static const String pasteMessage = 'Paste Message';
  static const String uploadScreenshot = 'Upload Screenshot';
  static const String howProtects = 'How Spectra Protects You';

  // Scanning
  static const String analyzeMessage = 'Analyze Message';
  static const String analyzeScreenshot = 'Analyze Screenshot';
  static const String pasteHint = 'Paste your suspicious message here...';

  // Analysis stages
  static const List<String> analysisStages = [
    'Processing input',
    'Extracting text',
    'Checking suspicious patterns',
    'Inspecting embedded URLs',
    'Performing AI analysis',
    'Preparing risk assessment',
  ];

  // Risk levels
  static const String riskLow = 'LOW RISK';
  static const String riskSuspicious = 'SUSPICIOUS';
  static const String riskHigh = 'HIGH RISK';

  // Results
  static const String evidence = 'Suspicious Phrases';
  static const String urls = 'URL Inspection';
  static const String recommendations = 'Safety Recommendations';
  static const String scanAnother = 'Scan Another Message';
  static const String saveToHistory = 'Save to History';

  // Errors
  static const String errorNetwork = 'Network error. Please check your connection.';
  static const String errorTimeout = 'Request timed out. Please try again.';
  static const String errorEmpty = 'Please enter a message to analyze.';
  static const String errorNoImage = 'Please select an image to analyze.';
  static const String errorFileTooLarge = 'Image must be smaller than 10 MB.';
  static const String errorInvalidFile = 'Unsupported file type. Please use JPEG or PNG.';
  static const String errorGeneric = 'Something went wrong. Please try again.';

  // Privacy
  static const String privacyConsent =
      'Saving this scan will store the risk level, date, and scan type. '
      'Raw messages and screenshots are never saved.';
  static const String historyEmpty = 'No scans yet. Analyze a message to get started.';
  static const String historyClearConfirm = 'Clear all scan history? This cannot be undone.';

  // About
  static const String aboutDescription =
      'Spectra is an AI-powered multimodal scam detection platform built to help '
      'individuals identify phishing attempts, fraudulent messages, and digital impersonation.';
  static const String version = '1.0.0';
  static const String disclaimerNote =
      'Spectra does not claim to detect every scam. '
      'Always exercise caution and verify through official channels.';
}
