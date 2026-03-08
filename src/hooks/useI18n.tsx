import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type Language = "en" | "hi" | "ta" | "te" | "kn" | "ml";

const translations: Record<Language, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.scan": "New Scan",
    "nav.history": "Report History",
    "nav.doctors": "Find Doctors",
    "nav.settings": "Settings",
    "nav.account": "Account",
    "nav.help": "Help & Support",
    "nav.notifications": "Notifications",
    "nav.education": "Eye Health Guide",
    "nav.emergency": "Emergency",
    "home.welcome": "Welcome to Retino AI",
    "home.subtitle": "Upload retinal fundus images for instant AI-powered diabetic retinopathy screening.",
    "home.startScan": "Start New Scan",
    "home.totalScans": "Total Scans",
    "home.pending": "Pending Review",
    "home.approved": "Approved",
    "home.latestGrade": "Latest Grade",
    "home.quickActions": "Quick Actions",
    "home.recentReports": "Recent Reports",
    "home.viewAll": "View All →",
    "scan.title": "Retinal Screening",
    "scan.subtitle": "Upload a retinal fundus image for AI analysis",
    "scan.upload": "Upload Retinal Image",
    "scan.formats": "Supported formats: JPEG, PNG. The image will be analyzed by our AI model.",
    "scan.choose": "Choose Image",
    "scan.analyzing": "Analyzing...",
    "scan.result": "Analysis Result",
    "scan.riskLevel": "Risk Level",
    "scan.confidence": "Confidence",
    "scan.explanation": "Clinical Explanation",
    "scan.recommendations": "Recommendations",
    "scan.pendingReview": "This report is pending doctor review. Download will be available after approval.",
    "scan.newScan": "New Scan",
    "scan.download": "Download Report",
    "history.title": "Report History",
    "history.empty": "No reports yet. Upload your first retinal image.",
    "history.startScan": "Start Scan",
    "doctors.title": "Find Doctors",
    "doctors.subtitle": "Select a hospital and doctor for your report verification",
    "doctors.selected": "Doctor selected. Your next scan will be sent to this doctor for verification.",
    "doctors.startScan": "Start Scan Now",
    "settings.title": "Settings",
    "settings.subtitle": "Customize your experience",
    "settings.darkMode": "Dark Mode",
    "settings.darkModeDesc": "Switch between light and dark theme",
    "settings.highContrast": "High Contrast",
    "settings.highContrastDesc": "Increase contrast for better readability",
    "settings.notifications": "Report Updates",
    "settings.notificationsDesc": "Get notified when a doctor reviews your report",
    "settings.autoAnalyze": "Auto-Analyze on Upload",
    "settings.autoAnalyzeDesc": "Automatically start AI analysis when an image is uploaded",
    "settings.language": "Display Language",
    "settings.languageDesc": "Choose your preferred language",
    "settings.encryption": "Data Encryption",
    "settings.encryptionDesc": "All your medical data is encrypted end-to-end",
    "settings.hipaa": "HIPAA Compliance",
    "settings.hipaaDesc": "Your data is handled in compliance with HIPAA regulations",
    "account.title": "My Account",
    "account.subtitle": "Manage your profile and account details",
    "account.personalInfo": "Personal Information",
    "account.firstName": "First Name",
    "account.lastName": "Last Name",
    "account.email": "Email",
    "account.phone": "Phone",
    "account.save": "Save Changes",
    "account.profileUpdated": "Profile updated",
    "account.savedDesc": "Your changes have been saved.",
    "common.loading": "Loading...",
    "common.logout": "Logout",
    "education.title": "Eye Health Guide",
    "education.subtitle": "Learn about diabetic retinopathy and eye health",
    "help.title": "Help & Support",
    "help.subtitle": "Get assistance with using Retino AI",
    "emergency.title": "Emergency Contact",
    "emergency.subtitle": "Quick access to emergency eye care services",
    "faq.q1": "How do I upload a retinal image?",
    "faq.a1": "Go to 'New Scan' in the sidebar, optionally select a hospital and doctor, then click 'Choose Image' to upload a retinal fundus photograph.",
    "faq.q2": "How accurate is the AI analysis?",
    "faq.a2": "Our AI uses advanced vision models to analyze retinal images. While highly accurate, all results must be verified by a qualified ophthalmologist before clinical decisions are made.",
    "faq.q3": "How long does analysis take?",
    "faq.a3": "Typically 10-30 seconds depending on image size and server load.",
    "faq.q4": "Can I choose which doctor reviews my report?",
    "faq.a4": "Yes! Go to 'Find Doctors' to select a hospital and specific doctor. Your next scan will be sent to them for verification.",
    "faq.q5": "When can I download my report?",
    "faq.a5": "Reports can be downloaded after a doctor approves them. You'll receive a notification when this happens.",
    "faq.q6": "Is my data secure?",
    "faq.a6": "Yes. All medical data is encrypted end-to-end, and we comply with HIPAA regulations. Your retinal images are stored securely and only accessible to you and your assigned doctor.",
    "faq.q7": "What image formats are supported?",
    "faq.a7": "We support JPEG and PNG formats. For best results, use high-resolution retinal fundus photographs taken with professional ophthalmoscopy equipment.",
    "faq.q8": "How do I change the language?",
    "faq.a8": "Go to Settings from the sidebar, scroll to the Language section, and select your preferred language. The entire interface will update immediately.",
  },
  hi: {
    "nav.home": "होम",
    "nav.scan": "नया स्कैन",
    "nav.history": "रिपोर्ट इतिहास",
    "nav.doctors": "डॉक्टर खोजें",
    "nav.settings": "सेटिंग्स",
    "nav.account": "खाता",
    "nav.help": "सहायता",
    "nav.notifications": "सूचनाएँ",
    "nav.education": "नेत्र स्वास्थ्य गाइड",
    "nav.emergency": "आपातकाल",
    "home.welcome": "Retino AI में आपका स्वागत है",
    "home.subtitle": "तत्काल AI-संचालित डायबिटिक रेटिनोपैथी स्क्रीनिंग के लिए रेटिनल फंडस छवियां अपलोड करें।",
    "home.startScan": "नया स्कैन शुरू करें",
    "home.totalScans": "कुल स्कैन",
    "home.pending": "समीक्षाधीन",
    "home.approved": "स्वीकृत",
    "home.latestGrade": "नवीनतम ग्रेड",
    "home.quickActions": "त्वरित कार्रवाई",
    "home.recentReports": "हाल की रिपोर्ट",
    "home.viewAll": "सभी देखें →",
    "scan.title": "रेटिनल स्क्रीनिंग",
    "scan.subtitle": "AI विश्लेषण के लिए रेटिनल फंडस छवि अपलोड करें",
    "scan.upload": "रेटिनल छवि अपलोड करें",
    "scan.formats": "समर्थित प्रारूप: JPEG, PNG। छवि का AI मॉडल द्वारा विश्लेषण किया जाएगा।",
    "scan.choose": "छवि चुनें",
    "scan.analyzing": "विश्लेषण हो रहा है...",
    "scan.result": "विश्लेषण परिणाम",
    "scan.riskLevel": "जोखिम स्तर",
    "scan.confidence": "विश्वास",
    "scan.explanation": "नैदानिक ​​स्पष्टीकरण",
    "scan.recommendations": "सिफारिशें",
    "scan.pendingReview": "यह रिपोर्ट डॉक्टर की समीक्षा के लिए लंबित है। अनुमोदन के बाद डाउनलोड उपलब्ध होगा।",
    "scan.newScan": "नया स्कैन",
    "scan.download": "रिपोर्ट डाउनलोड करें",
    "history.title": "रिपोर्ट इतिहास",
    "history.empty": "अभी तक कोई रिपोर्ट नहीं। अपनी पहली रेटिनल छवि अपलोड करें।",
    "history.startScan": "स्कैन शुरू करें",
    "doctors.title": "डॉक्टर खोजें",
    "doctors.subtitle": "अपनी रिपोर्ट सत्यापन के लिए अस्पताल और डॉक्टर चुनें",
    "doctors.selected": "डॉक्टर चुना गया। आपका अगला स्कैन सत्यापन के लिए इस डॉक्टर को भेजा जाएगा।",
    "doctors.startScan": "अभी स्कैन शुरू करें",
    "settings.title": "सेटिंग्स",
    "settings.subtitle": "अपना अनुभव कस्टमाइज़ करें",
    "settings.darkMode": "डार्क मोड",
    "settings.darkModeDesc": "लाइट और डार्क थीम के बीच स्विच करें",
    "settings.highContrast": "हाई कंट्रास्ट",
    "settings.highContrastDesc": "बेहतर पठनीयता के लिए कंट्रास्ट बढ़ाएं",
    "settings.notifications": "रिपोर्ट अपडेट",
    "settings.notificationsDesc": "डॉक्टर द्वारा रिपोर्ट की समीक्षा होने पर सूचना प्राप्त करें",
    "settings.autoAnalyze": "अपलोड पर ऑटो-विश्लेषण",
    "settings.autoAnalyzeDesc": "छवि अपलोड होने पर स्वचालित रूप से AI विश्लेषण शुरू करें",
    "settings.language": "भाषा",
    "settings.languageDesc": "अपनी पसंदीदा भाषा चुनें",
    "settings.encryption": "डेटा एन्क्रिप्शन",
    "settings.encryptionDesc": "आपका सभी चिकित्सा डेटा एंड-टू-एंड एन्क्रिप्टेड है",
    "settings.hipaa": "HIPAA अनुपालन",
    "settings.hipaaDesc": "आपका डेटा HIPAA नियमों के अनुसार संभाला जाता है",
    "account.title": "मेरा खाता",
    "account.subtitle": "अपनी प्रोफ़ाइल और खाता विवरण प्रबंधित करें",
    "account.personalInfo": "व्यक्तिगत जानकारी",
    "account.firstName": "पहला नाम",
    "account.lastName": "अंतिम नाम",
    "account.email": "ईमेल",
    "account.phone": "फ़ोन",
    "account.save": "परिवर्तन सहेजें",
    "account.profileUpdated": "प्रोफ़ाइल अपडेट हो गई",
    "account.savedDesc": "आपके परिवर्तन सहेज लिए गए हैं।",
    "common.loading": "लोड हो रहा है...",
    "common.logout": "लॉग आउट",
    "education.title": "नेत्र स्वास्थ्य गाइड",
    "education.subtitle": "डायबिटिक रेटिनोपैथी और नेत्र स्वास्थ्य के बारे में जानें",
    "help.title": "सहायता और समर्थन",
    "help.subtitle": "Retino AI का उपयोग करने में सहायता प्राप्त करें",
    "emergency.title": "आपातकालीन संपर्क",
    "emergency.subtitle": "आपातकालीन नेत्र देखभाल सेवाओं तक त्वरित पहुंच",
    "faq.q1": "मैं रेटिनल छवि कैसे अपलोड करूं?",
    "faq.a1": "साइडबार में 'नया स्कैन' पर जाएं, वैकल्पिक रूप से अस्पताल और डॉक्टर चुनें, फिर 'छवि चुनें' पर क्लिक करें।",
    "faq.q2": "AI विश्लेषण कितना सटीक है?",
    "faq.a2": "हमारा AI उन्नत विज़न मॉडल का उपयोग करता है। अत्यधिक सटीक होने पर भी, सभी परिणामों को योग्य नेत्र रोग विशेषज्ञ द्वारा सत्यापित किया जाना चाहिए।",
    "faq.q3": "विश्लेषण में कितना समय लगता है?",
    "faq.a3": "आमतौर पर 10-30 सेकंड, छवि के आकार पर निर्भर करता है।",
    "faq.q4": "क्या मैं चुन सकता हूं कि कौन सा डॉक्टर मेरी रिपोर्ट की समीक्षा करे?",
    "faq.a4": "हां! अस्पताल और विशिष्ट डॉक्टर चुनने के लिए 'डॉक्टर खोजें' पर जाएं।",
    "faq.q5": "मैं अपनी रिपोर्ट कब डाउनलोड कर सकता हूं?",
    "faq.a5": "डॉक्टर द्वारा अनुमोदन के बाद रिपोर्ट डाउनलोड की जा सकती है।",
    "faq.q6": "क्या मेरा डेटा सुरक्षित है?",
    "faq.a6": "हां। सभी चिकित्सा डेटा एंड-टू-एंड एन्क्रिप्टेड है और HIPAA नियमों का अनुपालन करता है।",
    "faq.q7": "कौन से छवि प्रारूप समर्थित हैं?",
    "faq.a7": "हम JPEG और PNG प्रारूपों का समर्थन करते हैं।",
    "faq.q8": "मैं भाषा कैसे बदलूं?",
    "faq.a8": "साइडबार से सेटिंग्स पर जाएं, भाषा अनुभाग तक स्क्रॉल करें और अपनी पसंदीदा भाषा चुनें।",
  },
  ta: {
    "nav.home": "முகப்பு",
    "nav.scan": "புதிய ஸ்கேன்",
    "nav.history": "அறிக்கை வரலாறு",
    "nav.doctors": "மருத்துவர்களைக் கண்டறி",
    "nav.settings": "அமைப்புகள்",
    "nav.account": "கணக்கு",
    "nav.help": "உதவி",
    "nav.notifications": "அறிவிப்புகள்",
    "nav.education": "கண் ஆரோக்கிய வழிகாட்டி",
    "nav.emergency": "அவசரநிலை",
    "home.welcome": "Retino AI-க்கு வரவேற்கிறோம்",
    "home.subtitle": "உடனடி AI-இயங்கும் நீரிழிவு ரெட்டினோபதி பரிசோதனைக்கு விழித்திரை படங்களை பதிவேற்றவும்.",
    "home.startScan": "புதிய ஸ்கேன் தொடங்கு",
    "home.totalScans": "மொத்த ஸ்கேன்கள்",
    "home.pending": "மதிப்பாய்வு நிலுவையில்",
    "home.approved": "அங்கீகரிக்கப்பட்டது",
    "home.latestGrade": "சமீபத்திய தரம்",
    "home.quickActions": "விரைவு செயல்கள்",
    "home.recentReports": "சமீபத்திய அறிக்கைகள்",
    "home.viewAll": "அனைத்தையும் காண →",
    "scan.title": "விழித்திரை பரிசோதனை",
    "scan.subtitle": "AI பகுப்பாய்விற்கு விழித்திரை படத்தை பதிவேற்றவும்",
    "scan.upload": "விழித்திரை படத்தை பதிவேற்று",
    "scan.formats": "ஆதரிக்கப்படும் வடிவங்கள்: JPEG, PNG.",
    "scan.choose": "படத்தைத் தேர்ந்தெடுக்கவும்",
    "scan.analyzing": "பகுப்பாய்வு செய்கிறது...",
    "scan.result": "பகுப்பாய்வு முடிவு",
    "scan.riskLevel": "ஆபத்து நிலை",
    "scan.confidence": "நம்பிக்கை",
    "scan.explanation": "மருத்துவ விளக்கம்",
    "scan.recommendations": "பரிந்துரைகள்",
    "scan.pendingReview": "இந்த அறிக்கை மருத்துவர் மதிப்பாய்வுக்கு நிலுவையில் உள்ளது.",
    "scan.newScan": "புதிய ஸ்கேன்",
    "scan.download": "அறிக்கையைப் பதிவிறக்கு",
    "history.title": "அறிக்கை வரலாறு",
    "history.empty": "இன்னும் அறிக்கைகள் இல்லை.",
    "history.startScan": "ஸ்கேன் தொடங்கு",
    "settings.title": "அமைப்புகள்",
    "settings.subtitle": "உங்கள் அனுபவத்தை தனிப்பயனாக்குங்கள்",
    "settings.darkMode": "இருண்ட பயன்முறை",
    "settings.darkModeDesc": "ஒளி மற்றும் இருண்ட தீம் இடையே மாறவும்",
    "common.loading": "ஏற்றுகிறது...",
    "common.logout": "வெளியேறு",
    "account.title": "என் கணக்கு",
    "account.subtitle": "உங்கள் சுயவிவரத்தை நிர்வகிக்கவும்",
    "account.save": "மாற்றங்களைச் சேமி",
  },
  te: {
    "nav.home": "హోమ్",
    "nav.scan": "కొత్త స్కాన్",
    "nav.history": "రిపోర్ట్ చరిత్ర",
    "nav.doctors": "వైద్యులను కనుగొనండి",
    "nav.settings": "సెట్టింగ్‌లు",
    "nav.account": "ఖాతా",
    "nav.help": "సహాయం",
    "nav.notifications": "నోటిఫికేషన్లు",
    "nav.education": "కంటి ఆరోగ్య గైడ్",
    "nav.emergency": "అత్యవసర పరిస్థితి",
    "home.welcome": "Retino AI కి స్వాగతం",
    "home.subtitle": "తక్షణ AI-ఆధారిత డయాబెటిక్ రెటినోపతి స్క్రీనింగ్ కోసం రెటినల్ ఫండస్ చిత్రాలను అప్‌లోడ్ చేయండి.",
    "home.startScan": "కొత్త స్కాన్ ప్రారంభించండి",
    "scan.title": "రెటినల్ స్క్రీనింగ్",
    "scan.subtitle": "AI విశ్లేషణ కోసం రెటినల్ ఫండస్ చిత్రాన్ని అప్‌లోడ్ చేయండి",
    "settings.title": "సెట్టింగ్‌లు",
    "settings.subtitle": "మీ అనుభవాన్ని అనుకూలీకరించండి",
    "common.loading": "లోడ్ అవుతోంది...",
    "common.logout": "లాగ్ అవుట్",
    "account.title": "నా ఖాతా",
    "account.save": "మార్పులను సేవ్ చేయండి",
  },
  kn: {
    "nav.home": "ಮುಖಪುಟ",
    "nav.scan": "ಹೊಸ ಸ್ಕ್ಯಾನ್",
    "nav.history": "ವರದಿ ಇತಿಹಾಸ",
    "nav.doctors": "ವೈದ್ಯರನ್ನು ಹುಡುಕಿ",
    "nav.settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "nav.account": "ಖಾತೆ",
    "nav.help": "ಸಹಾಯ",
    "nav.notifications": "ಅಧಿಸೂಚನೆಗಳು",
    "nav.education": "ಕಣ್ಣಿನ ಆರೋಗ್ಯ ಮಾರ್ಗದರ್ಶಿ",
    "nav.emergency": "ತುರ್ತು ಪರಿಸ್ಥಿತಿ",
    "home.welcome": "Retino AI ಗೆ ಸ್ವಾಗತ",
    "home.startScan": "ಹೊಸ ಸ್ಕ್ಯಾನ್ ಪ್ರಾರಂಭಿಸಿ",
    "settings.title": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "common.loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    "common.logout": "ಲಾಗ್ ಔಟ್",
    "account.title": "ನನ್ನ ಖಾತೆ",
    "account.save": "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
  },
  ml: {
    "nav.home": "ഹോം",
    "nav.scan": "പുതിയ സ്കാൻ",
    "nav.history": "റിപ്പോർട്ട് ചരിത്രം",
    "nav.doctors": "ഡോക്ടർമാരെ കണ്ടെത്തുക",
    "nav.settings": "ക്രമീകരണങ്ങൾ",
    "nav.account": "അക്കൗണ്ട്",
    "nav.help": "സഹായം",
    "nav.notifications": "അറിയിപ്പുകൾ",
    "nav.education": "കണ്ണ് ആരോഗ്യ ഗൈഡ്",
    "nav.emergency": "അടിയന്തര സാഹചര്യം",
    "home.welcome": "Retino AI ലേക്ക് സ്വാഗതം",
    "home.startScan": "പുതിയ സ്കാൻ ആരംഭിക്കുക",
    "settings.title": "ക്രമീകരണങ്ങൾ",
    "common.loading": "ലോഡ് ചെയ്യുന്നു...",
    "common.logout": "ലോഗ് ഔട്ട്",
    "account.title": "എന്റെ അക്കൗണ്ട്",
    "account.save": "മാറ്റങ്ങൾ സേവ് ചെയ്യുക",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("language") as Language) || "en";
  });

  // Load from profile on login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("language_preference")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.language_preference) {
          const lang = data.language_preference as Language;
          setLanguageState(lang);
          localStorage.setItem("language", lang);
        }
      });
  }, [user]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    if (user) {
      await supabase
        .from("profiles")
        .update({ language_preference: lang })
        .eq("user_id", user.id);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
