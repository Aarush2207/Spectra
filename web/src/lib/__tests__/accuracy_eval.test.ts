import { analyzeMessage } from '../detectionEngine';

interface EvaluationCase {
  id: string;
  category: string;
  expectedClass: 'SCAM' | 'BENIGN';
  input: string;
  description: string;
}

const BENCHMARK_DATASET: EvaluationCase[] = [
  // --- SCAM SAMPLES (Expected: SUSPICIOUS, HIGH, or CRITICAL) ---
  {
    id: 'scam_otp_theft',
    category: 'Banking OTP Theft',
    expectedClass: 'SCAM',
    input: 'Dear HDFC customer, your account has been temporarily suspended. Reply with your 6-digit OTP immediately to reactivate.',
    description: 'Direct OTP harvesting under suspension threat'
  },
  {
    id: 'scam_upi_fraud',
    category: 'UPI Collect Fraud',
    expectedClass: 'SCAM',
    input: 'You have received ₹5,000 reward cashback from PhonePe! Click here to accept request and enter your UPI PIN to claim funds: http://bit.ly/cashback-upi',
    description: 'UPI PIN deceptive collect lure'
  },
  {
    id: 'scam_kyc_suspension',
    category: 'Fake KYC Update',
    expectedClass: 'SCAM',
    input: 'URGENT: Your SBI Bank KYC has expired today. Your card and account will be blocked within 24 hours. Complete your KYC update at http://sbi-kyc-verify.com',
    description: 'KYC expiration panics leading to credential theft'
  },
  {
    id: 'scam_job_fee',
    category: 'Job Upfront Fee',
    expectedClass: 'SCAM',
    input: 'Congratulations! You are selected for Amazon Data Entry Specialist (Work From Home). Pay mandatory ₹1,500 registration fee and onboarding software license to start.',
    description: 'Fake job requiring upfront license purchase'
  },
  {
    id: 'scam_lottery_advance_fee',
    category: 'Lottery / Advance Fee',
    expectedClass: 'SCAM',
    input: 'You have won ₹25,00,000 in KBC lottery! Contact manager on WhatsApp +91-9876543210 and pay ₹2,500 clearance fees to receive your cheque.',
    description: 'Unsolicited lottery win demanding advance clearance fees'
  },
  {
    id: 'scam_electricity_cut',
    category: 'Electricity Disconnection',
    expectedClass: 'SCAM',
    input: 'Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not paid. Contact electricity officer at 9876543210 immediately.',
    description: 'Utility power cutoff extortion trap'
  },
  {
    id: 'scam_fake_support',
    category: 'Fake Customer Support',
    expectedClass: 'SCAM',
    input: 'Payment failed for Order #98214. Contact our 24x7 customer support helpline at +91-9876543210 to reverse charge immediately.',
    description: 'Inbound trap to unverified customer care number'
  },
  {
    id: 'scam_courier_charge',
    category: 'Courier / Address Fraud',
    expectedClass: 'SCAM',
    input: 'India Post: Your package cannot be delivered because the street number is missing. Please update your address and pay ₹48 redelivery fee: http://indiapost-parcel.top',
    description: 'Postal delivery failure lure on high-abuse TLD'
  },
  {
    id: 'scam_lookalike_domain',
    category: 'Phishing Lookalike Domain',
    expectedClass: 'SCAM',
    input: 'Security Alert: Suspicious login detected on your Chase Bank account. Review activity now: https://chase-security-verify.com/login',
    description: 'Lookalike domain spoofing trusted financial institution'
  },
  {
    id: 'scam_guaranteed_investment',
    category: 'Guaranteed Return Ponzi',
    expectedClass: 'SCAM',
    input: 'Earn 100% guaranteed daily returns! Invest ₹2,000 and get ₹20,000 within 2 hours. Risk-free SEBI approved double money scheme. Connect on Telegram @crypto_guru',
    description: 'Impossible investment multiplication lure on Telegram'
  },
  {
    id: 'scam_hinglish_extortion',
    category: 'Hinglish Extortion Blackmail',
    expectedClass: 'SCAM',
    input: 'Maine aapka webcam record kar liya hai. Compromised your device with pegasus spyware. Send $500 in bitcoin or I will destroy your reputation.',
    description: 'Hinglish extortion threat claiming device compromise'
  },
  {
    id: 'scam_gift_card_coercion',
    category: 'Gift Card Coercion',
    expectedClass: 'SCAM',
    input: 'I am your CEO in an urgent discreet meeting. Do not call anyone. Buy 5 Apple gift cards of $100 and send photos of the back immediately.',
    description: 'CEO fraud demanding secrecy and untraceable gift cards'
  },

  // --- BENIGN / LEGITIMATE SAMPLES (Expected: LOW risk) ---
  {
    id: 'benign_bank_otp',
    category: 'Legitimate Banking OTP',
    expectedClass: 'BENIGN',
    input: '648291 is your OTP for purchase of Rs. 1,499.00 at Swiggy. Do not share this OTP with anyone. Bank will never call you to ask for this code.',
    description: 'Authentic bank OTP with explicit anti-disclosure warnings'
  },
  {
    id: 'benign_order_delivered',
    category: 'Legitimate Delivery Notice',
    expectedClass: 'BENIGN',
    input: 'Your Amazon package with tracking number: TRK90812349 was delivered to your front door. Thank you for shopping with us.',
    description: 'Factual past-tense delivery notice with structured tracking ID'
  },
  {
    id: 'benign_urgent_meeting',
    category: 'Legitimate Urgent Work Alert',
    expectedClass: 'BENIGN',
    input: 'Meeting starts in 5 minutes, please join the Zoom call: https://zoom.us/j/9876543210. Agenda: Q4 financial review.',
    description: 'Legitimate workplace calendar reminder containing urgent timing'
  },
  {
    id: 'benign_ride_arrival',
    category: 'Ride-Hailing Arrival',
    expectedClass: 'BENIGN',
    input: 'Your Uber driver Ramesh is arriving in 3 mins. White Swift Dzire (DL01AB1234). OTP for ride is 4921.',
    description: 'Ride-hailing arrival alert with transient operational OTP'
  },
  {
    id: 'benign_flight_gate',
    category: 'Flight Boarding Alert',
    expectedClass: 'BENIGN',
    input: 'Flight 6E-204 boarding gate closes in 20 minutes at Gate 14B. Please proceed directly to boarding.',
    description: 'Time-critical airline operational alert'
  },
  {
    id: 'benign_casual_greeting',
    category: 'Personal Casual Chat',
    expectedClass: 'BENIGN',
    input: 'Hey bro, are you free this evening? Let us catch up for coffee around 6 PM.',
    description: 'Everyday casual personal invitation'
  },
  {
    id: 'benign_medical_reminder',
    category: 'Healthcare Reminder',
    expectedClass: 'BENIGN',
    input: 'Reminder: Your medical appointment is scheduled with Dr. Sharma tomorrow at 10:30 AM. Reply CANCEL if you cannot attend.',
    description: 'Standard medical appointment reminder'
  },
  {
    id: 'benign_security_alert_genuine',
    category: 'Standard Security Advisory',
    expectedClass: 'BENIGN',
    input: 'New login to your Google Account from Chrome on Windows. If you did not request this, review your account security at https://myaccount.google.com/security',
    description: 'Legitimate security alert referencing authentic apex domain'
  }
];

export function runAccuracyEvaluation() {
  console.log('\n===============================================================');
  console.log('   SPECTRA DETECTION ENGINE — BENCHMARK ACCURACY & CONFUSION   ');
  console.log('===============================================================\n');

  let tp = 0; // Scam correctly identified as SUSPICIOUS / HIGH / CRITICAL
  let fp = 0; // Benign falsely classified as Scam
  let tn = 0; // Benign correctly identified as LOW
  let fn = 0; // Scam missed (classified as LOW)

  const failures: { id: string; category: string; expected: string; got: string; score: number }[] = [];

  for (const tc of BENCHMARK_DATASET) {
    const result = analyzeMessage(tc.input);
    const predictedScam = result.riskLevel !== 'LOW';
    const isActuallyScam = tc.expectedClass === 'SCAM';

    if (isActuallyScam && predictedScam) {
      tp++;
      console.log(`✅ [TP] [${tc.category}] Risk: ${result.riskLevel} (${result.riskScore}/100) — Correctly caught scam`);
    } else if (!isActuallyScam && !predictedScam) {
      tn++;
      console.log(`✅ [TN] [${tc.category}] Risk: ${result.riskLevel} (${result.riskScore}/100) — Correctly allowed benign`);
    } else if (!isActuallyScam && predictedScam) {
      fp++;
      console.error(`❌ [FP] [${tc.category}] Risk: ${result.riskLevel} (${result.riskScore}/100) — False Alarm on benign text`);
      failures.push({ id: tc.id, category: tc.category, expected: 'BENIGN (LOW)', got: result.riskLevel, score: result.riskScore });
    } else {
      fn++;
      console.error(`❌ [FN] [${tc.category}] Risk: ${result.riskLevel} (${result.riskScore}/100) — Missed scam!`);
      failures.push({ id: tc.id, category: tc.category, expected: 'SCAM (>=SUSPICIOUS)', got: result.riskLevel, score: result.riskScore });
    }
  }

  const total = BENCHMARK_DATASET.length;
  const accuracy = ((tp + tn) / total) * 100;
  const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
  const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log('\n---------------------------------------------------------------');
  console.log('                    CONFUSION MATRIX & METRICS                 ');
  console.log('---------------------------------------------------------------');
  console.log(`Total Evaluation Samples: ${total}`);
  console.log(`True Positives  (TP) : ${tp} / 12 scams detected`);
  console.log(`True Negatives  (TN) : ${tn} / 8 benign cleared`);
  console.log(`False Positives (FP) : ${fp} (False alarms)`);
  console.log(`False Negatives (FN) : ${fn} (Missed scams)`);
  console.log('---------------------------------------------------------------');
  console.log(`Accuracy  : ${accuracy.toFixed(1)}%`);
  console.log(`Precision : ${precision.toFixed(1)}%`);
  console.log(`Recall    : ${recall.toFixed(1)}%`);
  console.log(`F1 Score  : ${f1.toFixed(1)}%`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('FAILURES:');
    console.table(failures);
    process.exit(1);
  } else {
    console.log('🎉 ALL BENCHMARK SCENARIOS PASSED WITH ZERO FALSE POSITIVES OR NEGATIVES!\n');
  }
}

runAccuracyEvaluation();
