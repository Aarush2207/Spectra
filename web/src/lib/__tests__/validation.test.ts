import { validateTextInput, validateUrlInput, validateOcrExtraction } from '../inputValidation';

function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`, details);
      failed++;
    }
  }

  console.log('\n--- SPECTRA Validation Edge Cases Test Suite ---\n');

  // 1. Empty string -> Reject
  const test1 = validateTextInput('');
  assert('1. Empty string is rejected', !test1.valid && test1.reasonCode === 'EMPTY_INPUT', test1);

  // 1b. Whitespace only -> Reject
  const test1b = validateTextInput('    \n\t  ');
  assert('1b. Whitespace-only string is rejected', !test1b.valid && test1b.reasonCode === 'EMPTY_INPUT', test1b);

  // 2. "asdfghjkl" -> Reject
  const test2 = validateTextInput('asdfghjkl');
  assert('2. Keyboard mash "asdfghjkl" is rejected', !test2.valid && test2.reasonCode === 'MEANINGLESS_TEXT', test2);

  // 2b. Repeated meaningless characters "aaaaaaaaaaaa" -> Reject
  const test2b = validateTextInput('aaaaaaaaaaaa');
  assert('2b. Repeated characters "aaaaaaaaaaaa" is rejected', !test2b.valid && test2b.reasonCode === 'MEANINGLESS_TEXT', test2b);

  // 3. "!!!!!!!!!!" -> Reject
  const test3 = validateTextInput('!!!!!!!!!!');
  assert('3. Punctuation sequence "!!!!!!!!!!" is rejected', !test3.valid && test3.reasonCode === 'MEANINGLESS_TEXT', test3);

  // 3b. Symbols and emojis only -> Reject
  const test3b = validateTextInput('😂😂🔥🔥🙌👍');
  assert('3b. Emojis-only sequence is rejected', !test3b.valid && test3b.reasonCode === 'MEANINGLESS_TEXT', test3b);

  // 4. "Hello, how are you?" -> Accept
  const test4 = validateTextInput('Hello, how are you?');
  assert('4. "Hello, how are you?" is accepted', test4.valid, test4);

  // 5. "Your OTP is 123456" -> Accept
  const test5 = validateTextInput('Your OTP is 123456');
  assert('5. "Your OTP is 123456" is accepted', test5.valid, test5);

  // 6. "Your bank account will be blocked. Verify now." -> Accept
  const test6 = validateTextInput('Your bank account will be blocked. Verify now.');
  assert('6. "Your bank account will be blocked. Verify now." is accepted', test6.valid, test6);

  // 7. Hindi scam message -> Accept
  const test7 = validateTextInput('आपका बैंक खाता ब्लॉक कर दिया गया है। तुरंत पैन लिंक करें: http://bit.ly/bank-kyc');
  assert('7. Hindi scam message is accepted', test7.valid, test7);

  // 8. Hinglish WhatsApp message -> Accept
  const test8 = validateTextInput('Bhai please mujhe 5000 rupay bhejo urgent hai kal wapis kar dunga');
  assert('8. Hinglish WhatsApp message is accepted', test8.valid, test8);

  // 9. Valid HTTPS URL -> Accept
  const test9 = validateUrlInput('https://secure-login.bank-portal.com/auth');
  assert('9. Valid HTTPS URL is accepted', test9.valid && test9.metadata?.hostname === 'secure-login.bank-portal.com', test9);

  // 9b. Suspicious lookalike domain -> Accept
  const test9b = validateUrlInput('https://paypa1-security-verification.com/login');
  assert('9b. Suspicious lookalike URL is accepted for inspection', test9b.valid, test9b);

  // 10. "javascript:alert(1)" -> Reject
  const test10 = validateUrlInput('javascript:alert(1)');
  assert('10. "javascript:alert(1)" is rejected', !test10.valid && test10.reasonCode === 'UNSUPPORTED_PROTOCOL', test10);

  // 10b. SSRF / Localhost -> Reject
  const test10b = validateUrlInput('http://127.0.0.1:8080/admin');
  assert('10b. Localhost / Loopback URL is rejected', !test10b.valid && test10b.reasonCode === 'INVALID_HOSTNAME', test10b);

  // 10c. AWS Metadata 169.254.169.254 -> Reject
  const test10c = validateUrlInput('http://169.254.169.254/latest/meta-data/');
  assert('10c. Cloud metadata IP is rejected', !test10c.valid && test10c.reasonCode === 'INVALID_HOSTNAME', test10c);

  // 11. Random non-URL text in URL field -> Reject
  const test11 = validateUrlInput('just some random text without domain');
  assert('11. Random non-URL string is rejected in URL field', !test11.valid, test11);

  // 12. Blank screenshot (empty OCR text) -> Reject
  const test12 = validateOcrExtraction('', 0);
  assert('12. Blank screenshot (empty OCR) is rejected', !test12.valid && test12.reasonCode === 'NO_TEXT_DETECTED', test12);

  // 13. WhatsApp screenshot with readable text -> Accept
  const test13 = validateOcrExtraction(
    'WhatsApp\nToday 10:45 AM\nSender: HR Team\nDear candidate, you have been selected for remote part time job with daily payout ₹3000. Contact on Telegram.',
    92
  );
  assert('13. WhatsApp screenshot with readable text is accepted', test13.valid, test13);

  // 14. Screenshot with low OCR confidence (< 35) -> Request clearer image / manual text
  const test14 = validateOcrExtraction('x? .-- a!1', 22);
  assert('14. Low OCR confidence is flagged with suggestion to enter manually', 
    !test14.valid && (test14.reasonCode === 'LOW_OCR_CONFIDENCE' || test14.reasonCode === 'IRRELEVANT_IMAGE'), 
    test14
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests();
