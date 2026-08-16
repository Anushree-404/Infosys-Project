/**
 * India States and their major cities (OpenWeatherMap compatible names)
 */

export interface StateData {
  state: string;
  districts: string[];
}

export const INDIA_LOCATIONS: StateData[] = [
  {
    state: "Andhra Pradesh",
    districts: ["Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Rajahmundry","Tirupati","Kakinada","Kadapa","Anantapur","Eluru","Ongole","Srikakulam","Vizianagaram","Machilipatnam"]
  },
  {
    state: "Telangana",
    districts: ["Hyderabad","Warangal","Nizamabad","Khammam","Karimnagar","Ramagundam","Mahbubnagar","Nalgonda","Adilabad","Suryapet","Siddipet","Miryalaguda","Jagtial","Mancherial"]
  },
  {
    state: "Karnataka",
    districts: ["Bengaluru","Mysore","Mangalore","Hubli","Belgaum","Shimoga","Davanagere","Bijapur","Tumkur","Udupi","Kolar","Hassan","Gulbarga","Bidar","Bellary","Dharwad","Gadag","Raichur","Chitradurga","Bagalkot"]
  },
  {
    state: "Tamil Nadu",
    districts: ["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Tiruppur","Vellore","Erode","Thoothukudi","Dindigul","Thanjavur","Kanchipuram","Nagercoil","Cuddalore","Kumbakonam","Pudukkottai","Ramanathapuram","Sivaganga","Virudhunagar"]
  },
  {
    state: "Kerala",
    districts: ["Thiruvananthapuram","Kochi","Kozhikode","Thrissur","Kollam","Palakkad","Alappuzha","Kannur","Kottayam","Malappuram","Pathanamthitta","Idukki","Kasaragod","Wayanad"]
  },
  {
    state: "Maharashtra",
    districts: ["Mumbai","Pune","Nagpur","Nashik","Aurangabad","Solapur","Kolhapur","Amravati","Nanded","Sangli","Satara","Latur","Akola","Jalgaon","Chandrapur","Dhule","Ahmednagar","Osmanabad","Bid","Yavatmal"]
  },
  {
    state: "Gujarat",
    districts: ["Ahmedabad","Surat","Vadodara","Rajkot","Gandhinagar","Bhavnagar","Jamnagar","Junagadh","Anand","Nadiad","Morvi","Mehsana","Bharuch","Valsad","Navsari","Porbandar","Amreli","Botad","Dwarka","Dahod"]
  },
  {
    state: "Rajasthan",
    districts: ["Jaipur","Jodhpur","Udaipur","Kota","Bikaner","Ajmer","Alwar","Bhilwara","Sikar","Sri Ganganagar","Pali","Barmer","Hanumangarh","Churu","Tonk","Sawai Madhopur","Nagaur","Chittorgarh","Bundi","Dholpur"]
  },
  {
    state: "Madhya Pradesh",
    districts: ["Bhopal","Indore","Jabalpur","Gwalior","Ujjain","Sagar","Rewa","Satna","Ratlam","Katni","Chhindwara","Dewas","Betul","Murwara","Singrauli","Burhanpur","Khandwa","Bhind","Morena","Guna"]
  },
  {
    state: "Uttar Pradesh",
    districts: ["Lucknow","Kanpur","Agra","Varanasi","Allahabad","Meerut","Noida","Ghaziabad","Aligarh","Moradabad","Bareilly","Saharanpur","Gorakhpur","Faizabad","Mathura","Firozabad","Muzaffarnagar","Bulandshahr","Hapur","Jhansi"]
  },
  {
    state: "Bihar",
    districts: ["Patna","Gaya","Bhagalpur","Muzaffarpur","Purnia","Bihar Sharif","Arrah","Begusarai","Katihar","Munger","Chhapra","Darbhanga","Motihari","Hajipur","Sitamarhi","Samastipur","Siwan","Sasaram","Nawada","Bettiah"]
  },
  {
    state: "West Bengal",
    districts: ["Kolkata","Howrah","Asansol","Siliguri","Durgapur","Bardhaman","Malda","Baharampur","Habra","Kharagpur","Shantipur","Dankuni","Dhulian","Ranaghat","Haldia","Raiganj","Krishnanagar","Nabadwip","Cooch Behar","Darjeeling"]
  },
  {
    state: "Punjab",
    districts: ["Ludhiana","Amritsar","Jalandhar","Patiala","Bathinda","Hoshiarpur","Mohali","Firozpur","Phagwara","Batala","Moga","Pathankot","Abohar","Gurdaspur","Muktsar","Barnala","Kapurthala","Sangrur","Fatehgarh Sahib","Fazilka"]
  },
  {
    state: "Haryana",
    districts: ["Faridabad","Gurugram","Panipat","Ambala","Yamunanagar","Rohtak","Hisar","Karnal","Sonipat","Panchkula","Bhiwani","Sirsa","Bahadurgarh","Jind","Thanesar","Kaithal","Rewari","Palwal","Narnaul","Fatehabad"]
  },
  {
    state: "Odisha",
    districts: ["Bhubaneswar","Cuttack","Rourkela","Brahmapur","Sambalpur","Puri","Balasore","Bhadrak","Baripada","Jharsuguda","Jeypore","Angul","Dhenkanal","Kendujhar","Paradip","Bargarh","Rayagada","Koraput","Sundargarh","Balangir"]
  },
  {
    state: "Assam",
    districts: ["Guwahati","Dibrugarh","Silchar","Jorhat","Nagaon","Tinsukia","Tezpur","Bongaigaon","Dhubri","Diphu","Sivasagar","Golaghat","Barpeta","Karimganj","Haflong","Mangaldoi","Lumding","North Lakhimpur","Goalpara","Nalbari"]
  },
  {
    state: "Jharkhand",
    districts: ["Ranchi","Jamshedpur","Dhanbad","Bokaro","Deoghar","Phusro","Hazaribagh","Giridih","Ramgarh","Medininagar","Chaibasa","Chirkunda","Dumka","Godda","Gumla","Lohardaga","Pakur","Sahibganj","Simdega","Khunti"]
  },
  {
    state: "Chhattisgarh",
    districts: ["Raipur","Bhilai","Bilaspur","Durg","Rajnandgaon","Korba","Ambikapur","Raigarh","Jagdalpur","Dhamtari","Mahasamund","Kanker","Kondagaon","Sukma","Bijapur","Narayanpur","Gariaband","Balod","Balodabazar","Mungeli"]
  },
  {
    state: "Himachal Pradesh",
    districts: ["Shimla","Dharamshala","Solan","Mandi","Palampur","Baddi","Nahan","Kullu","Chamba","Una","Hamirpur","Bilaspur","Kangra","Kinnaur","Lahaul","Sirmaur","Spiti","Rampur","Sundernagar","Sarkaghat"]
  },
  {
    state: "Uttarakhand",
    districts: ["Dehradun","Haridwar","Roorkee","Haldwani","Kashipur","Rudrapur","Rishikesh","Kotdwar","Ramnagar","Pithoragarh","Almora","Nainital","Bageshwar","Chamoli","Champawat","Pauri","Tehri","Uttarkashi","Rudraprayag","Mussoorie"]
  },
  {
    state: "Goa",
    districts: ["Panaji","Margao","Vasco da Gama","Mapusa","Ponda","Bicholim","Curchorem","Sanquelim","Valpoi","Pernem","Calangute","Canacona","Quepem","Sanguem","Mormugao","Tiswadi","Bardez","Salcete","Ponda","Dicholi"]
  },
];

export const getStateNames = (): string[] =>
  INDIA_LOCATIONS.map(l => l.state).sort();

export const getDistrictsByState = (state: string): string[] => {
  const found = INDIA_LOCATIONS.find(
    l => l.state.toLowerCase() === state.toLowerCase()
  );
  return found ? found.districts.sort() : [];
};
