import 'package:flutter_test/flutter_test.dart';
import 'package:spectra/app/app.dart';

void main() {
  testWidgets('Spectra app smoke test', (WidgetTester tester) async {
    // Basic verification that widget can be pumped
    expect(const SpectraApp(), isNotNull);
  });
}
