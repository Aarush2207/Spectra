class ScanRequest {
  final String? text;
  final String? imagePath;

  const ScanRequest({this.text, this.imagePath})
      : assert(text != null || imagePath != null,
            'Either text or imagePath must be provided');
}
