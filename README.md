# Client Registry

Ka simple app ya kutunza taarifa za wateja kabla ya kufanya application (mfano BRELA), ili usimsumbue mteja mara kwa mara na maswali ya NIDA wakati mfumo wa BRELA una-timeout.

## Vipengele

**Tab 1 — Leseni za Biashara (BRELA client registration, kama awali)**
- Ongeza / edit / futa client (Jina, Simu, NIDA, Aina ya Biashara, Maelezo)
- Tafuta client kwa jina, simu au NIDA
- Button ya **View** — inaonyesha taarifa zote za mteja, kisha unaweza ku-copy field moja moja au taarifa zote kwa pamoja

**Tab 2 — Annual Return (Makampuni/Taasisi)** — mpya
- Sajili kampuni/taasisi: Company Number, jina, registered office, company type, principal activities, Company Secretary, Issued Share Capital
- Ongeza Directors na Wanahisa (Members) wengi kwa kila kampuni (dynamic rows — ongeza/ondoa)
- Kwa kila kampuni, fungua **View** kuona taarifa zote na "Annual Returns" tracker: ongeza return mpya kwa kuweka tarehe ("made up to"), fuatilia status yake (Pending → Inaandaliwa → Imefiliwa BRELA → Imekamilika)
- Bofya **Pakua Form 131** kwenye return yoyote — app inatengeneza moja kwa moja Form 131 (.docx) iliyojaa taarifa za kampuni hiyo kwa tarehe hiyo ya return, tayari kuchapishwa/kusainiwa/kuwasilishwa ORS
- Taarifa za kampuni (directors, secretary, shares) hazihitaji kuandikwa upya kila mwaka — unaongeza tu return mpya na kubonyeza Pakua Form 131
- **Documents za kampuni** — pakia na uhifadhi: Certificate of Incorporation, Memorandum & Articles of Association (MEMARTS), TIN Certificate ya kampuni, Business Licence, Audited Financial Statements, Annual Return iliyopita, NIDA za Directors/Secretary, Tax Clearance Certificate, Board Resolution. Kila document inabadilishwa kuwa PDF kiotomatiki na kuhifadhiwa kwenye folder lake la kampuni (`uploads/company-<id>-<jina>/`), sawa na ilivyo upande wa clients

## Mahitaji
- [Node.js](https://nodejs.org) (v18 au zaidi) — download na install kama huna
- XAMPP (MySQL) ikiwa tayari inaendesha kwenye kompyuta yako

## Hatua za Kuiwasha (Windows + XAMPP)

### 1. Washa MySQL kwenye XAMPP
Fungua **XAMPP Control Panel** → bofya **Start** kwenye MySQL.


### 2. Tengeneza database
- Fungua `http://localhost/phpmyadmin`
- Bofya **SQL** tab, paste content ya faili `schema.sql` (iliyopo hapa), kisha **Go**
- Hii itatengeneza database `client_registry` na table `clients`
- Kama database tayari ipo (unaboresha app ya zamani), huna haja ya kuendesha ALTER za mikono — app yenyewe inaunda tables mpya za Annual Return (`company_clients`, `company_directors`, `company_members`, `company_returns`) kiotomatiki mara ya kwanza unapoiwasha (`npm start`). Endesha tu `schema.sql` mpya kama unaanzisha database kabisa upya.

### 3. Install dependencies za app
Fungua terminal/command prompt kwenye folder ya app (`client-registry`), kisha:
```
npm install
```

### 4. Weka database config
Copy faili `.env.example` uite `.env`, kisha hakikisha values zinaendana na XAMPP yako (kawaida default ni sahihi tu):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=client_registry
DB_PORT=3306
PORT=4000
```
*(Kama umeweka password kwenye MySQL root user yako, iweke hapo DB_PASSWORD)*

### 5. Washa app
```
npm start
```
Utaona: `Client Registry inaendesha kwenye http://localhost:4000`

### 6. Fungua kwenye browser
Nenda `http://localhost:4000` — app iko tayari kutumika.

## Workflow ya kila siku
1. Mteja anapokutafuta, mwongeze kwa "+ Mteja Mpya" — jaza jina, simu, NIDA, aina ya biashara. Email na password ni hiari kwa sababu mteja anaweza bado hajafungua account
2. Ukiwa tayari kufanya application BRELA, fungua record ya mteja kwa **View**, copy field moja moja au bofya **Copy All Details**, kisha paste taarifa kwenye form ya BRELA — hutahitaji kumpigia tena mteja
3. Baada ya kukamilisha application, unaweza kumfuta client kwenye list (au kumuacha kama rekodi ya kumbukumbu)

## Workflow ya Annual Return
1. Bofya tab **"Annual Return — Makampuni"**, kisha **"+ Kampuni Mpya"**
2. Jaza taarifa za kampuni (Company Number, jina, registered office, secretary, share capital), ongeza Directors na Wanahisa
3. Baada ya kusave, fungua kampuni kwa **View** → kwenye sehemu ya "Annual Returns", weka tarehe ya "made up to" (mfano tarehe ya anniversary ya usajili) na bofya **"+ Ongeza Return"**
4. Bofya **"Pakua Form 131"** — utapata .docx tayari yenye taarifa zote, chapisha, mwombe Director asaini, kisha pakia ORS
5. Baada ya kuwasilisha, badilisha status ya return hiyo kuwa "Imefiliwa BRELA" ili uifuatilie kwa urahisi mwakani

## Kuiendesha bila kuwasha terminal kila siku (hiari)
Unaweza kuunda shortcut ya `npm start` kama `.bat` file kwenye Windows ili uibofye tu badala ya kufungua terminal kila siku — nikitaka nikutengenezee hiyo pia.
