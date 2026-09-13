# Client Registry

Ka simple app ya kutunza taarifa za wateja kabla ya kufanya application (mfano BRELA), ili usimsumbue mteja mara kwa mara na maswali ya NIDA wakati mfumo wa BRELA una-timeout.

## Vipengele
- Ongeza / edit / futa client (Jina, Simu, NIDA, Aina ya Biashara, Maelezo)
- Tafuta client kwa jina, simu au NIDA
- Button ya **View** — inaonyesha taarifa zote za mteja, kisha unaweza ku-copy field moja moja au taarifa zote kwa pamoja

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
- Kama database tayari ipo, endesha hii kwenye **SQL** tab ili kuongeza fields mpya za hiari:
```sql
ALTER TABLE clients
	ADD COLUMN email VARCHAR(255),
	ADD COLUMN password VARCHAR(255);
```

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

## Kuiendesha bila kuwasha terminal kila siku (hiari)
Unaweza kuunda shortcut ya `npm start` kama `.bat` file kwenye Windows ili uibofye tu badala ya kufungua terminal kila siku — nikitaka nikutengenezee hiyo pia.
