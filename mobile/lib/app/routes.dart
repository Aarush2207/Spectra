import 'package:go_router/go_router.dart';
import '../features/auth/auth_screen.dart';
import '../features/splash/splash_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/home/main_shell.dart';
import '../features/text_scanner/text_scanner_screen.dart';
import '../features/image_scanner/image_scanner_screen.dart';
import '../features/url_scanner/url_scanner_screen.dart';
import '../features/analysis/analysis_loading_screen.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/results/results_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (_, __) => const SplashScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (_, __) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/auth',
      builder: (_, __) => const AuthScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (_, __) => const MainShell(),
    ),
    GoRoute(
      path: '/analytics',
      builder: (_, __) => const AnalyticsScreen(),
    ),
    GoRoute(
      path: '/text-scanner',
      builder: (_, __) => const TextScannerScreen(),
    ),
    GoRoute(
      path: '/image-scanner',
      builder: (_, __) => const ImageScannerScreen(),
    ),
    GoRoute(
      path: '/url-scanner',
      builder: (_, __) => const UrlScannerScreen(),
    ),
    GoRoute(
      path: '/analysis-loading',
      builder: (_, __) => const AnalysisLoadingScreen(),
    ),
    GoRoute(
      path: '/results',
      builder: (_, __) => const ResultsScreen(),
    ),
  ],
);
