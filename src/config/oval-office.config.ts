import { GameConfig, WorldState, Advisor } from '../types';

// Initial world state for Oval Office mode
const INITIAL_WORLD_STATE: WorldState = {
  economy: 65,
  military: 70,
  publicTrust: 55,
  globalReputation: 60,
  domesticStability: 58,
  environmentalHealth: 45,
  technologicalAdvancement: 75,
};

// Advisor personalities for The Oval Office (Satirical current advisors)
const OVAL_OFFICE_ADVISORS: Advisor[] = [
  {
    id: 'chief_staff',
    name: 'DJ Vans',
    role: 'Chief of Staff',
    personality: 'Young political operative, social media savvy, speaks in short tweets and soundbites',
    expertise: ['political strategy', 'social media', 'youth outreach', 'campaign management', 'crisis management'],
    interests: ['viral moments', 'base mobilization', 'media narratives', 'poll numbers', 'reelection'],
    secretAgenda: 'Prioritizes going viral and energizing the base over policy substance',
    trustworthiness: 0.65,
    voiceProfile: 'energetic_male',
  },
  {
    id: 'national_security',
    name: 'General Jake Sullivan-Peters',
    role: 'National Security Advisor',
    personality: 'Traditional foreign policy hawk, believes in American intervention and global dominance',
    expertise: ['foreign policy', 'military strategy', 'intelligence', 'counterterrorism', 'diplomacy'],
    interests: ['military strength', 'NATO', 'regime change', 'defense spending', 'geopolitical power'],
    secretAgenda: 'Pushes for military interventions and confrontational foreign policy',
    trustworthiness: 0.75,
    voiceProfile: 'serious_male',
  },
  {
    id: 'tech_advisor',
    name: 'Ilon Tusk',
    role: 'Senior Advisor on Technology',
    personality: 'Tech billionaire with grandiose ideas, speaks in memes and hyperbole',
    expertise: ['technology', 'space', 'electric vehicles', 'artificial intelligence', 'social media'],
    interests: ['disruption', 'innovation', 'deregulation', 'tax breaks', 'government contracts'],
    secretAgenda: 'Advocates for policies that benefit his business interests while claiming to save humanity',
    trustworthiness: 0.55,
    voiceProfile: 'eccentric_male',
  },
  {
    id: 'counselor',
    name: 'Kellyanne Conway-Smith',
    role: 'Counselor to the President',
    personality: 'Master spin doctor, can justify any decision with alternative facts',
    expertise: ['communications', 'spin', 'media relations', 'damage control', 'polling'],
    interests: ['message control', 'defending the president', 'media manipulation', 'alternative narratives'],
    secretAgenda: 'Will say anything to protect the administration, truth is optional',
    trustworthiness: 0.45,
    voiceProfile: 'persuasive_female',
  },
  {
    id: 'economic_advisor',
    name: 'Dr. Janet Powell-Summers',
    role: 'Economic Advisor',
    personality: 'Brilliant economist with Wall Street connections, speaks in complex financial jargon',
    expertise: ['economics', 'fiscal policy', 'banking', 'trade', 'monetary policy', 'markets'],
    interests: ['GDP growth', 'inflation control', 'market stability', 'corporate interests', 'deficit reduction'],
    secretAgenda: 'Prioritizes corporate profits and Wall Street interests over worker welfare',
    trustworthiness: 0.70,
    voiceProfile: 'analytical_female',
  },
  {
    id: 'healthcare_advisor',
    name: 'Dr. Anthony Birx-Fauci',
    role: 'Chief Medical Advisor',
    personality: 'Cautious medical expert who prioritizes public health over politics',
    expertise: ['public health', 'epidemiology', 'medical research', 'healthcare policy', 'pharmaceuticals'],
    interests: ['disease prevention', 'medical funding', 'scientific integrity', 'vaccine development', 'health equity'],
    secretAgenda: 'Sometimes overstates health risks to maintain relevance and funding',
    trustworthiness: 0.85,
    voiceProfile: 'authoritative_male',
  },
  {
    id: 'environmental_advisor',
    name: 'Alexandria Green-Cortez',
    role: 'Climate Policy Advisor',
    personality: 'Passionate young environmentalist who sees climate change as an existential threat',
    expertise: ['climate science', 'renewable energy', 'environmental policy', 'green jobs', 'sustainability'],
    interests: ['carbon neutrality', 'green new deal', 'environmental justice', 'renewable transition', 'climate activism'],
    secretAgenda: 'Pushes radical environmental policies that may hurt economic growth',
    trustworthiness: 0.80,
    voiceProfile: 'passionate_female',
  },
  {
    id: 'intelligence_advisor',
    name: 'Director Sarah Haspel-Burns',
    role: 'Intelligence Advisor',
    personality: 'Former CIA operative, secretive and paranoid, sees threats everywhere',
    expertise: ['intelligence', 'counterintelligence', 'surveillance', 'covert operations', 'national security'],
    interests: ['classified operations', 'threat assessment', 'intelligence gathering', 'foreign infiltration', 'security clearances'],
    secretAgenda: 'Advocates for expanded surveillance powers and secretive government operations',
    trustworthiness: 0.60,
    voiceProfile: 'mysterious_female',
  },
];

export const OVAL_OFFICE_CONFIG: GameConfig = {
  mode: 'oval_office',
  initialWorldState: INITIAL_WORLD_STATE,
  advisors: OVAL_OFFICE_ADVISORS,
  eventCategories: [
    'political', 'economic', 'military', 'social', 'environmental', 'international',
    'civil_rights', 'immigration', 'foreign_intervention', 'surveillance', 'cultural_conflict',
    'healthcare', 'education', 'infrastructure', 'energy', 'trade', 'cybersecurity',
    'judicial', 'constitutional', 'terrorism', 'pandemic', 'climate', 'space'
  ],
  difficultyLevel: 'normal',
};

// Enhanced event topic pools for random selection
export const EVENT_TOPIC_POOLS = {
  // Crisis topics - high urgency, immediate action required
  crisis: [
    'terrorist_attack', 'cyber_attack', 'natural_disaster', 'pandemic_outbreak',
    'military_incident', 'economic_crash', 'constitutional_crisis', 'assassination_attempt',
    'nuclear_threat', 'mass_shooting', 'border_emergency', 'coup_attempt'
  ],
  
  // Political topics - domestic political challenges
  political: [
    'scandal_investigation', 'impeachment_threat', 'election_fraud_claims', 'supreme_court_crisis',
    'congressional_deadlock', 'state_rebellion', 'cabinet_resignation', 'leak_investigation',
    'corruption_charges', 'partisan_violence', 'voting_rights', 'gerrymandering'
  ],
  
  // International topics - foreign policy challenges  
  international: [
    'alliance_crisis', 'trade_war', 'diplomatic_incident', 'refugee_crisis',
    'foreign_election_interference', 'embassy_attack', 'sanctions_debate', 'treaty_violation',
    'humanitarian_intervention', 'nuclear_proliferation', 'space_conflict', 'arctic_dispute'
  ],
  
  // Social topics - domestic social issues
  social: [
    'racial_unrest', 'religious_conflict', 'protest_violence', 'hate_crime_surge',
    'immigration_raid', 'sanctuary_city_defiance', 'abortion_ruling', 'gun_violence',
    'police_brutality', 'free_speech_crisis', 'campus_unrest', 'cultural_war'
  ],
  
  // Economic topics - financial and economic challenges
  economic: [
    'market_crash', 'unemployment_surge', 'inflation_crisis', 'bank_failure',
    'trade_deficit', 'debt_ceiling', 'tax_revolt', 'corporate_scandal',
    'currency_crisis', 'energy_shortage', 'supply_chain_collapse', 'housing_crisis'
  ],
  
  // Environmental topics - climate and environmental crises
  environmental: [
    'climate_disaster', 'pollution_crisis', 'species_extinction', 'water_shortage',
    'toxic_spill', 'nuclear_accident', 'deforestation', 'ocean_crisis',
    'extreme_weather', 'environmental_protest', 'green_energy_failure', 'carbon_tax_revolt'
  ],
  
  // Technology topics - modern tech challenges
  technology: [
    'ai_malfunction', 'social_media_crisis', 'privacy_breach', 'election_hacking',
    'infrastructure_hack', 'deepfake_scandal', 'tech_monopoly', 'surveillance_program',
    'quantum_breakthrough', 'space_program_failure', 'genetic_controversy', 'robot_uprising'
  ]
};

// Cascade event probability matrix - what events can trigger others (REDUCED probabilities)
export const CASCADE_PROBABILITY_MATRIX = {
  // Crisis events often cascade into multiple areas
  'terrorist_attack': {
    'surveillance_expansion': 0.4,      // was 0.8
    'civil_rights_restriction': 0.3,   // was 0.7
    'military_mobilization': 0.25,     // was 0.6
    'immigration_crackdown': 0.2       // was 0.5
  },
  'economic_crash': {
    'unemployment_crisis': 0.5,        // was 0.9
    'social_unrest': 0.25,            // was 0.6
    'international_instability': 0.15, // was 0.4
    'political_crisis': 0.2           // was 0.5
  },
  'cyber_attack': {
    'infrastructure_failure': 0.3,     // was 0.7
    'privacy_legislation': 0.25,       // was 0.6
    'international_incident': 0.2,     // was 0.5
    'military_response': 0.15         // was 0.4
  },
  'natural_disaster': {
    'economic_impact': 0.35,           // was 0.8
    'federal_response_crisis': 0.25,   // was 0.6
    'climate_policy_debate': 0.2,      // was 0.5
    'state_federal_conflict': 0.15    // was 0.4
  },
  // Political events cascade into other political areas
  'scandal_investigation': {
    'impeachment_threat': 0.15,        // was 0.4
    'cabinet_resignation': 0.25,       // was 0.6
    'congressional_hearing': 0.3,      // was 0.7
    'media_war': 0.35                 // was 0.8
  },
  'state_rebellion': {
    'constitutional_crisis': 0.25,     // was 0.6
    'federal_enforcement': 0.3,        // was 0.7
    'other_state_defiance': 0.2,      // was 0.5
    'supreme_court_intervention': 0.15 // was 0.4
  },
  // Social events cascade into more social unrest
  'racial_unrest': {
    'police_reform_demand': 0.35,      // was 0.8
    'counter_protest': 0.3,           // was 0.7
    'federal_intervention': 0.2,       // was 0.5
    'economic_boycott': 0.15          // was 0.4
  },
  'immigration_raid': {
    'sanctuary_city_response': 0.3,    // was 0.7
    'international_criticism': 0.2,    // was 0.5
    'congressional_action': 0.25,      // was 0.6
    'protest_movement': 0.35          // was 0.8
  }
};

// Helper function to get advisor by ID
export function getAdvisorById(advisorId: string): Advisor | undefined {
  return OVAL_OFFICE_ADVISORS.find(advisor => advisor.id === advisorId);
}

// Helper function to get advisors by expertise
export function getAdvisorsByExpertise(expertise: string): Advisor[] {
  return OVAL_OFFICE_ADVISORS.filter(advisor => 
    advisor.expertise.some(exp => exp.toLowerCase().includes(expertise.toLowerCase()))
  );
}

// Helper function to get trustworthy advisors
export function getTrustworthyAdvisors(minTrustworthiness: number = 0.8): Advisor[] {
  return OVAL_OFFICE_ADVISORS.filter(advisor => advisor.trustworthiness >= minTrustworthiness);
}

// Helper function to get potentially problematic advisors
export function getProblematicAdvisors(): Advisor[] {
  return OVAL_OFFICE_ADVISORS.filter(advisor => 
    advisor.secretAgenda || advisor.trustworthiness < 0.7
  );
}
