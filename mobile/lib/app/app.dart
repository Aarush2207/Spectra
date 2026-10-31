import 'package:flutter/material.dart';
import 'routes.dart';
import 'theme.dart';

class SpectraApp extends StatelessWidget {
  const SpectraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Spectra',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: appRouter,
    );
  }
}
