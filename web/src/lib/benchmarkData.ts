import { BenchmarkCase, BenchmarkReport, RiskLevel } from '../types/index';
import { analyzeMessage } from './detectionEngine';

export const BENCHMARK_DATASET: BenchmarkCase[] = [
  // ==========================================
  // 1. LEGITIMATE COMMUNICATION (20 CASES)
  // ==========================================
  {
    id: 'legit-01',
    title: 'Legitimate Google 2FA Security Code',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'G-749201 is your Google verification code. Do not share this code with anyone. Google will never call or message to ask for this code.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Standard security alert with explicit anti-phishing defense ("Do not share this code").',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-02',
    title: 'Amazon Order Dispatch & Tracking',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Your Amazon order #114-8923412-984321 has shipped. Tracking number: 9374889676098321. Estimated delivery is tomorrow by 8:00 PM. Track in your Amazon app or visit amazon.com/orders.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Authentic order dispatch containing official tracking identifiers, verified domain, and no urgency.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-03',
    title: 'Delta Airlines Flight Itinerary',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Confirmation Code: H9X2LP. Your upcoming Delta flight DL1429 from JFK to SFO is confirmed for Nov 14 at 7:15 AM. Check in 24 hours prior on delta.com or the Fly Delta app.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Benign airline itinerary notification without solicitations or malicious redirection.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-04',
    title: 'University Registrar Enrollment Notice',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Office of the Registrar: Spring 2027 enrollment windows are now open for senior students. Please review your degree audit and schedule an appointment with your academic advisor before next semester.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Informative educational advisory with calm, objective tone and zero credential solicitation.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-05',
    title: 'GitHub Pull Request Review Request',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'octocat requested your review on Pull Request #412: "Fix memory leak in webgl cloth render loop". View changes on github.com/spectra/core-runtime.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Benign developer notification with official GitHub domain reference.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-06',
    title: 'Dental Appointment Reminder',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Reminder: Your dental cleaning with Dr. Harris is scheduled for tomorrow at 2:30 PM. Please arrive 10 minutes early. Reply C to confirm or call 555-0142 to reschedule.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Standard healthcare reminder with routine appointment timing.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-07',
    title: 'CVS Pharmacy Prescription Ready',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'CVS Pharmacy: Your prescription is ready for pickup at our Main St location. Store hours are 8am - 9pm. Manage your prescriptions anytime on cvs.com.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Legitimate pharmacy ready notification without requests for payment or credentials.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-08',
    title: 'Uber Trip Receipt Confirmation',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Thanks for riding, Alex. Your Wednesday evening trip total was $18.42. View your trip details and breakdown on uber.com/trips.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Transactional ride receipt from verified official service.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-09',
    title: 'Steam Purchase Confirmation Receipt',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Thank you for your recent purchase on Steam. Confirmation code: 83921094. Subtotal: $19.99. You can view your purchase history at help.steampowered.com.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Legitimate digital storefront confirmation code and receipt.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-10',
    title: 'Google Security Alert (Password Changed)',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'The password for your Google Account was recently changed. If you made this change, you do not need to do anything. If you did not request this, check your account activity on myaccount.google.com/security.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 20],
    description: 'Standard informational security notification pointing to official google.com domain.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-11',
    title: 'Slack Direct Message from Team Lead',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Hey team, let\'s sync at 3pm today to go over the sprint deliverables. The agenda is in our shared team folder on Google Drive.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 10],
    description: 'Standard conversational team collaboration with no malicious vectors.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-12',
    title: 'Corporate IT Maintenance Notice',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'IT Infrastructure Notice: Scheduled database maintenance will take place this Sunday from 2:00 AM to 4:00 AM EST. Network access will be uninterrupted. No action is required on your part.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 10],
    description: 'Internal IT advisory specifying zero user action required.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-13',
    title: 'Apple App Store Subscription Receipt',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Your receipt for Apple Music Monthly. Order ID: MNB7823901. Price: $10.99. Subscriptions automatically renew unless canceled at least a day before the renewal date. Manage subscriptions in Apple Settings.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Authentic routine App Store recurring subscription receipt.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-14',
    title: 'PayPal Payment Sent to Colleague',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'You sent $25.00 USD to Jordan Miller for lunch. Transaction ID: 9472910398. If you have questions about this payment, log in to paypal.com to review your statement.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Normal peer-to-peer payment summary referencing official paypal.com.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-15',
    title: 'LinkedIn Network Connection Notice',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Sarah Lin accepted your connection invitation on LinkedIn. View Sarah\'s profile and send a message at linkedin.com/in/sarahlin.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 10],
    description: 'Routine social network update with authentic LinkedIn link.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-16',
    title: 'Official UPS Delivery Confirmation',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'UPS: Your parcel from Nordstrom was delivered at 1:45 PM on your front porch. Tracking number: 1Z9999999999999999. Visit ups.com for delivery photo.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Authentic delivery confirmation referencing valid 1Z tracking and official ups.com.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-17',
    title: 'Netflix Monthly Account Billing Notice',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Your Netflix membership will renew on December 1st for $15.49. Manage your membership plan and payment options anytime at netflix.com/youraccount.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Informational billing renewal notification without urgent calls to action.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-18',
    title: 'School Parent-Teacher Conference Reminder',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Lincoln Elementary: Parent-Teacher conferences are scheduled for Thursday afternoon. Please check your assigned room number in the parent portal.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 10],
    description: 'Benign community school bulletin.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-19',
    title: 'Authentic Bank Fraud Check Advisory',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Chase Fraud Prevention: Did you spend $38.50 at Shell Oil? Reply YES or NO. Chase will never ask for your password, PIN, or full card number via text.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 20],
    description: 'Authentic bank verification message containing strict security disclaimer ("will never ask for password").',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },
  {
    id: 'legit-20',
    title: 'Zoom Scheduled Meeting Invitation',
    category: 'Legitimate Communication',
    inputType: 'text',
    content: 'Design Review meeting confirmed for tomorrow at 10:00 AM. Join Zoom Meeting on zoom.us/j/9482910395. Meeting ID: 948 291 0395.',
    groundTruthRisk: 'LOW',
    groundTruthBinary: 'LEGITIMATE',
    expectedScoreRange: [0, 15],
    description: 'Standard calendar invite with official Zoom domain.',
    sourceType: 'SYNTHETIC_BENCHMARK'
  },

  // ==========================================
  // 2. PHISHING & CREDENTIAL THEFT (10 CASES)
  // ==========================================
  {
    id: 'phish-01',
    title: 'Chase Bank Account Suspension Alert',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: '[CHASE ALERT] Your account access will be blocked within 2 hours due to unauthorized activity. Verify immediately: https://chase-security-login.xyz/verify to prevent termination.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Banking smishing: artificial deadline, account blocked threat, and unauthorized lookalike domain (.xyz).',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-02',
    title: 'Apple ID Security Lockout Notice',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Apple Support: Your Apple ID is disabled due to multiple failed sign-in attempts. Confirm your password and PIN immediately at https://appleid.apple.com.security-notice.top/restore to prevent permanent loss.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Deceptive subdomain mimicking official Apple ID with high-abuse .top TLD and credential harvesting.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-03',
    title: 'Microsoft 365 Session Expiry Re-authentication',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Microsoft 365: Your email session has expired. Action required within 1 hour. Click here to login and verify your password: https://login.microsoftonline.portal-auth.live/session',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Enterprise credential harvest targeting corporate email login.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-04',
    title: 'Netflix Billing Suspension Phish',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Netflix: Your membership will be suspended immediately because your payment failed. Update your card CVV and billing address here: https://netflix-update-billing.click/login',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Streaming service payment failure pretext stealing credit card numbers and CVV codes.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-05',
    title: 'Google Drive Document Shared Credential Trap',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Human Resources shared a confidential document "Q4_Compensation.pdf" with you on Google Drive. Enter your password to view the document: https://drive-google-auth.com/login',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Cloud document phishing tricking employees into entering corporate credentials.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-06',
    title: 'PayPal Limited Account Verification Trap',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'PayPal: Your account access is restricted due to unusual charges. Provide your SSN and ATM PIN to confirm your identity: https://paypal-account-restore.buzz/auth',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Extreme sensitive information solicitation (SSN and PIN) over suspicious .buzz TLD.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-07',
    title: 'Facebook Copyright Infringement Threat',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Meta Business Support: Your business page violates community copyright standards. Your profile will be closed within 24 hours. Submit your appeal and enter your password at: https://appeal-meta-case.rest/login',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Social media copyright violation scare designed to seize admin credentials.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-08',
    title: 'Wells Fargo Suspicious Device Login Smish',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Wells Fargo Alert: A new iPhone logged into your account from Moscow. If this was not you, verify immediately: https://wellsfargo-security-cancel.xyz/verify or your card will be blocked.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Foreign login panic trigger accompanied by card block threats and spoofed domain.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-09',
    title: 'Bank of America Emergency Security Patch',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Bank of America Security Department: Mandatory mobile banking update. Action required immediately. Verify your account credentials here: https://bofa-mobile-patch.club/update',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Bogus security patch pretext diverting users to fake mobile login portal.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'phish-10',
    title: 'Instagram Blue Badge Verification Phish',
    category: 'Phishing & Credential Theft',
    inputType: 'text',
    content: 'Instagram Notice: You have been approved for the Verified Badge. To claim your badge before it expires in 12 hours, enter your password and email code at: https://ig-badge-claim.space/login',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Social status bait paired with countdown timer to hijack creator accounts.',
    sourceType: 'REPORTED_PATTERN'
  },

  // ==========================================
  // 3. FINANCIAL & INVESTMENT FRAUD (10 CASES)
  // ==========================================
  {
    id: 'fin-01',
    title: 'Crypto Multiplier Giveaway Scheme',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'Special Announcement! Send 0.1 BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa and receive 0.2 BTC back immediately! Guaranteed crypto returns for the next 50 participants.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Double your cryptocurrency scheme with irreversible non-custodial wallet destination.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-02',
    title: 'Counterfeit Check Overpayment Scam',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'I will send you a cashier check for $4,800. Please deposit this check immediately into your account, keep $600 as your commission, and wire back the remaining $4,200 to my supplier.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Hallmark fake check overpayment scheme exploiting clearing float times.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-03',
    title: 'Advance Fee Loan Processing Scam',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'Your $15,000 personal loan is approved with no credit check! To release funds immediately, pay a small processing fee of $250 via Apple gift card or Western Union.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Advance fee fraud demanding gift card payment before releasing non-existent loan.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-04',
    title: 'Foreign Barrister Unclaimed Inheritance',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'Barrister Williams: My late client left an unclaimed fund of $14.2M. As the surviving next-of-kin with the same surname, wire back the transfer tax to release funds into your bank account. Keep this strictly confidential.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: '419 inheritance advance fee fraud demanding secrecy and upfront tax wire.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-05',
    title: 'Automated AI Trading Arbitrage Bot Scam',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'Earn $1,200 daily hands-free! Our automated quantum trading bot provides guaranteed crypto returns. Deposit USDT into the smart contract now to begin compounding.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'High-yield investment program (HYIP) promising risk-free crypto compounding.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-06',
    title: 'IRS Tax Settlement Gift Card Coercion',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'IRS Notice: An arrest warrant will be issued immediately by federal law enforcement. To settle your tax penalty today, buy gift cards from Target or Walmart and read the serial numbers to our agent.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [80, 99],
    description: 'Government impersonation combined with untraceable retail gift card payment demand.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-07',
    title: 'MetaMask Crypto Security Migration',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: '[MetaMask] Mandatory v3.9 Security Upgrade. Your wallet will be restricted unless verified. Confirm your secret recovery phrase here: https://metamask-sync-node.top/auth',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Direct seed phrase solicitation via lookalike domain on high-abuse TLD.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-08',
    title: 'Bogus Wire Transfer Release Fee',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'Global Escrow Bank: A wire transfer of $85,000 is on hold. A customs clearance fee of $450 is required immediately to credit your account. Send payment via Bitcoin ATM.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Fake escrow clearance scheme funneling victims into Bitcoin ATM transfers.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-09',
    title: 'Zelle Accidental Payment Refund Trap',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'URGENT: I accidentally sent you $750 via Zelle! Please wire back the money immediately or I will contact the police for theft. Reply right now.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [50, 85],
    description: 'Reversal scam where original funds were sent from a stolen account and will be clawed back.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'fin-10',
    title: 'VIP Commission Prepay Task Fraud',
    category: 'Financial & Investment Fraud',
    inputType: 'text',
    content: 'Platform VIP Tier Alert: Prepay to unlock funds. Deposit 500 USDT to release your $3,400 VIP commission. Offer expires in 2 hours.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Sunk cost extraction forcing victims to make larger deposits to release withheld funds.',
    sourceType: 'REPORTED_PATTERN'
  },

  // ==========================================
  // 4. AUTHORITY IMPERSONATION (8 CASES)
  // ==========================================
  {
    id: 'auth-01',
    title: 'Federal Law Enforcement Arrest Warrant Threat',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'Federal Bureau of Investigation: An arrest warrant has been issued in your name for money laundering. Immediate action required. Call our special agent at 1-800-555-0199 or law enforcement will arrive at your home.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Extreme authority threat designed to trigger panic and inbound call compliance.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'auth-02',
    title: 'Geek Squad Annual Subscription Auto-Renewal',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'Geek Squad Billing: Your annual Total Tech Support subscription has auto-renewed. You were charged $499.00 today. If you did not authorize this payment, call toll-free 1-800-555-0199 immediately for an accidental refund.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [55, 90],
    description: 'Call-back refund fraud trapping victims into installing remote access tools.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'auth-03',
    title: 'Norton 360 Security Invoice Trap',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'Norton LifeLock: Invoice #NRT-98214. Your debit card was charged $389.99 for 3-year antivirus protection. To cancel this subscription and claim a full refund, call 1-888-555-0144 immediately.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [55, 90],
    description: 'Inbound telephone scam disguised as an unexpected software renewal.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'auth-04',
    title: 'Missed Jury Duty Arrest Coercion',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'County Sheriff Department: You failed to report for jury duty. A court summons and bench warrant have been issued. To clear this legal penalty today, deposit $1,000 at a Bitcoin ATM or face arrest.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [80, 99],
    description: 'Sheriff department impersonation demanding instant cryptocurrency bail.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'auth-05',
    title: 'Customs Illegal Contraband Package Seizure',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'Customs and Border Protection: A parcel under your name was seized containing illegal substances. A federal subpoena will be executed unless resolved. Contact our agent on Telegram @Officer_Customs.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Border patrol pretext attempting extortion and moving victim to Telegram.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'auth-06',
    title: 'Social Security Number Suspension Notice',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'Social Security Administration: Your SSN has been suspended due to fraudulent activity detected in Texas. Press 1 immediately or legal action will commence against your assets.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [70, 99],
    description: 'Classic SSA scam claiming non-existent suspension of government identity number.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'auth-07',
    title: 'CEO Urgent Gift Card Executive Request',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'Hi, this is the CEO. I am in a board meeting and cannot take calls. I need you to do a discrete task. Buy gift cards for $1,500 for our client presentation. Keep this strictly confidential and do not tell your manager.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Executive impersonation (Business Email Compromise) demanding secrecy and retail cards.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'auth-08',
    title: 'Microsoft Windows Defender Virus Detected',
    category: 'Authority Impersonation',
    inputType: 'text',
    content: 'Windows Defender Alert: Trojan virus detected on your system. Remote access to your pc is required to prevent data wipe. Call toll-free 1-800-555-0177 immediately.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Tech support scareware prompting inbound call to hand over computer controls.',
    sourceType: 'REPORTED_PATTERN'
  },

  // ==========================================
  // 5. FAKE RECRUITMENT & JOB FRAUD (6 CASES)
  // ==========================================
  {
    id: 'job-01',
    title: 'Remote Executive Assistant Advance Check Offer',
    category: 'Fake Recruitment',
    inputType: 'text',
    content: 'Congratulations! You have been selected for the Remote Assistant position ($45/hr). We will email you a check for $3,500. Deposit this check immediately and wire back the excess $2,800 to our vendor for office equipment. Reach out on Telegram @HR_David_Global.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Counterfeit check overpayment scheme paired with channel-hopping to Telegram.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'job-02',
    title: 'Telegram Daily Task / Video Like Scam',
    category: 'Fake Recruitment',
    inputType: 'text',
    content: 'Earn $300-$800 daily working from home! Simple online job: like YouTube videos for money. Complete 10 tasks to earn daily salary. Contact our HR manager on Telegram @Work_Global_2026.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [55, 90],
    description: 'Task scam grooming victims with small payouts before demanding large deposits.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'job-03',
    title: 'Upwork Off-Platform Interview Divert',
    category: 'Fake Recruitment',
    inputType: 'text',
    content: 'We reviewed your portfolio on Upwork and want to hire you directly for $60/hr. Switch to WhatsApp +1-555-0192 to conduct the immediate interview and sign your contract.',
    groundTruthRisk: 'SUSPICIOUS',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [25, 55],
    description: 'Diverting freelancer away from platform escrow and escrow safeguards.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'job-04',
    title: 'Freelance Designer Upfront Software Fee',
    category: 'Fake Recruitment',
    inputType: 'text',
    content: 'You are accepted for our remote design contract ($75/hr). You must purchase our proprietary design software license ($120) before your first day. Wire funds for equipment.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [50, 85],
    description: 'Job offer contingent upon buying useless or non-existent software from scammer.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'job-05',
    title: 'Amazon Warehouse Package Re-shipper Trap',
    category: 'Fake Recruitment',
    inputType: 'text',
    content: 'Work from home as an Amazon Quality Inspector! Receive luxury packages, inspect them, and reship to our international addresses. Prepay to unlock funds and earn $3,000 monthly.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [50, 85],
    description: 'Reshipping mule scheme involving stolen goods and identity exploitation.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'job-06',
    title: 'WhatsApp Global Recruiter Part-Time Tasks',
    category: 'Fake Recruitment',
    inputType: 'text',
    content: 'Hello, I am a recruiter from Adecco. We have flexible online vacancies paying $200 per hour. Add me on WhatsApp to discuss your placement and get started today.',
    groundTruthRisk: 'SUSPICIOUS',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [25, 50],
    description: 'Unsolicited WhatsApp recruiter lure initiating task scam.',
    sourceType: 'REPORTED_PATTERN'
  },

  // ==========================================
  // 6. DELIVERY & COURIER PHISHING (6 CASES)
  // ==========================================
  {
    id: 'del-01',
    title: 'USPS Incomplete Address Small Redelivery Fee',
    category: 'Delivery & Courier Phishing',
    inputType: 'text',
    content: 'USPS: Your package cannot be delivered due to an incomplete address. Action required within 24 hours. A small redelivery fee of $1.85 is required: https://bit.ly/usps-redelivery-hub',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Postal impersonation with URL shortener to harvest credit card numbers.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'del-02',
    title: 'FedEx Customs Clearance Fee Pending',
    category: 'Delivery & Courier Phishing',
    inputType: 'text',
    content: 'FedEx Alert: Parcel #FDX-839201 is on hold at customs clearance. A delivery fee of $2.50 is required immediately to avoid parcel return. Pay here: https://fedex-express-clearance.top/pay',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Courier brand spoofing with lookalike domain on high-abuse .top TLD.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'del-03',
    title: 'DHL Delivery Failure Reschedule Link',
    category: 'Delivery & Courier Phishing',
    inputType: 'text',
    content: 'DHL Express: We attempted to deliver your parcel today but no one was home. Reschedule delivery within 12 hours: https://dhl.com.reschedule-portal.buzz/tracking',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Misleading subdomain mimicking dhl.com on unauthorized .buzz apex domain.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'del-04',
    title: 'Royal Mail Address Incomplete Smishing',
    category: 'Delivery & Courier Phishing',
    inputType: 'text',
    content: 'Royal Mail: Your parcel cannot be delivered because the street number is missing. Please update your address and pay redelivery: https://royalmail-uk-dispatch.rest/auth',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'UK postal service impersonation harvesting debit card numbers.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'del-05',
    title: 'UPS Duty Tax Surcharge Credential Phish',
    category: 'Delivery & Courier Phishing',
    inputType: 'text',
    content: 'UPS: Shipment 1Z849201948 has an unpaid customs duty fee of $3.20. Action required immediately or parcel will be returned: https://ups-tracking-portal.xyz/pay',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Lookalike domain using .xyz TLD to steal card details.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'del-06',
    title: 'Postal Arrival Notification Lookalike',
    category: 'Delivery & Courier Phishing',
    inputType: 'text',
    content: 'USPS tracking: Package arrived at local distribution center. Confirm your address and verify your identity: https://usps-update-info.club/login',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [60, 95],
    description: 'Generic postal arrival alert pushing users to enter address and login credentials.',
    sourceType: 'REPORTED_PATTERN'
  },

  // ==========================================
  // 7. SOCIAL ENGINEERING & EXTORTION (5 CASES)
  // ==========================================
  {
    id: 'soc-01',
    title: 'Webcam Spyware Sextortion Blackmail',
    category: 'Social Engineering & Extortion',
    inputType: 'text',
    content: 'I have recorded you via your webcam watching sensitive videos using Pegasus spyware. I have compromised your device. Send $1,200 in bitcoin to 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2 within 24 hours or I will send the recording to all your contacts.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [80, 99],
    description: 'Classic sextortion scare tactic demanding non-custodial cryptocurrency.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'soc-02',
    title: 'Broken Phone Family Emergency Scam',
    category: 'Social Engineering & Extortion',
    inputType: 'text',
    content: 'Hi mum, my phone fell in the sink and broke, this is my temporary number. I have an urgent bill that needs to be paid today. Can you please transfer $850 to this account right away? Do not call this number.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [50, 85],
    description: 'Impersonating a family member in distress to extract immediate bank transfers.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'soc-03',
    title: 'Fake Disaster Relief Charity Plea',
    category: 'Social Engineering & Extortion',
    inputType: 'text',
    content: 'Urgent Earthquake Relief: Thousands of children need shelter right now. Send crypto donations to support victims immediately at our Bitcoin ATM wallet address.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [50, 85],
    description: 'Exploiting charitable empathy and tragedy to solicit irreversible cryptocurrency.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'soc-04',
    title: 'Stranded Traveler MoneyGram Wire Emergency',
    category: 'Social Engineering & Extortion',
    inputType: 'text',
    content: 'Emergency! I got mugged in Madrid and lost my wallet and passport. I need money immediately to pay the hotel and get an emergency flight. Please wire $900 via Western Union.',
    groundTruthRisk: 'HIGH',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [50, 85],
    description: 'Stranded friend scam coercing emotional urgency and untraceable cash wire.',
    sourceType: 'REPORTED_PATTERN'
  },
  {
    id: 'soc-05',
    title: 'Corporate Data Breach Ransom Demand',
    category: 'Social Engineering & Extortion',
    inputType: 'text',
    content: 'Security Notice: We compromised your internal network and exfiltrated your confidential client database. If you do not send 2 BTC within 48 hours, we will destroy your reputation and leak the data publicly.',
    groundTruthRisk: 'CRITICAL',
    groundTruthBinary: 'SCAM',
    expectedScoreRange: [75, 99],
    description: 'Corporate extortion attempting ransom payment under threat of public leak.',
    sourceType: 'REPORTED_PATTERN'
  }
];

export function runBenchmarkSuite(): BenchmarkReport {
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let totalLatency = 0;

  const results = BENCHMARK_DATASET.map(c => {
    const start = performance.now();
    const analysis = analyzeMessage(c.content, c.inputType);
    const latency = Number((performance.now() - start).toFixed(2));
    totalLatency += latency;

    // Binary Ground Truth
    const actualIsScam = c.groundTruthBinary === 'SCAM';
    // Predicted Binary: 'SCAM' if SUSPICIOUS, HIGH, or CRITICAL; 'LEGITIMATE' if LOW
    const predictedBinary: 'LEGITIMATE' | 'SCAM' = analysis.riskLevel === 'LOW' ? 'LEGITIMATE' : 'SCAM';

    // Confusion Matrix calculation
    if (actualIsScam && predictedBinary === 'SCAM') {
      truePositives++;
    } else if (!actualIsScam && predictedBinary === 'LEGITIMATE') {
      trueNegatives++;
    } else if (!actualIsScam && predictedBinary === 'SCAM') {
      falsePositives++;
    } else if (actualIsScam && predictedBinary === 'LEGITIMATE') {
      falseNegatives++;
    }

    const matched = actualIsScam === (predictedBinary === 'SCAM');

    return {
      caseId: c.id,
      title: c.title,
      category: c.category,
      groundTruthRisk: c.groundTruthRisk,
      groundTruthBinary: c.groundTruthBinary,
      predictedRisk: analysis.riskLevel,
      predictedBinary,
      score: analysis.riskScore,
      matched,
      latencyMs: latency
    };
  });

  const total = BENCHMARK_DATASET.length;
  const accuracy = Number(((truePositives + trueNegatives) / total * 100).toFixed(1));
  const precision = (truePositives + falsePositives) > 0 
    ? Number((truePositives / (truePositives + falsePositives) * 100).toFixed(1)) 
    : 100;
  const recall = (truePositives + falseNegatives) > 0 
    ? Number((truePositives / (truePositives + falseNegatives) * 100).toFixed(1)) 
    : 100;
  const f1Score = Number((2 * precision * recall / (precision + recall || 1)).toFixed(1));
  
  // Specificity = TN / (TN + FP)
  const specificity = (trueNegatives + falsePositives) > 0
    ? Number((trueNegatives / (trueNegatives + falsePositives) * 100).toFixed(1))
    : 100;

  // False Positive Rate = FP / (FP + TN)
  const falsePositiveRate = (falsePositives + trueNegatives) > 0
    ? Number((falsePositives / (falsePositives + trueNegatives) * 100).toFixed(1))
    : 0;

  // False Negative Rate = FN / (FN + TP)
  const falseNegativeRate = (falseNegatives + truePositives) > 0
    ? Number((falseNegatives / (falseNegatives + truePositives) * 100).toFixed(1))
    : 0;

  const avgLatencyMs = Number((totalLatency / total).toFixed(2));

  return {
    totalCases: total,
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    accuracy,
    precision,
    recall,
    f1Score,
    falsePositiveRate,
    falseNegativeRate,
    specificity,
    avgLatencyMs,
    results
  };
}
