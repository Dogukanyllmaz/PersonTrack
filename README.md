# 🚀 PersonTrack

**PersonTrack**, organizasyonların kendi içlerinde güvenli bir şekilde personel, toplantı ve görev yönetimi yapabilmesini sağlayan modern bir takip sistemidir.

Kurumsal kullanım senaryoları için geliştirilmiş olup, şirket içi iletişim, toplantı kayıtları ve organizasyonel hafızanın merkezi olarak konumlandırılmıştır.

---

## 🧠 Proje Amacı

Bu sistemin temel amacı:

* Personel bilgilerini merkezi olarak yönetmek
* Toplantı süreçlerini kayıt altına almak
* Kurum içi karar mekanizmalarını izlenebilir hale getirmek
* Organizasyonel hafıza oluşturmak

---

## ⚙️ Özellikler

### 👤 Personel Yönetimi

* Detaylı personel profilleri
* İletişim bilgileri
* Görev / unvan takibi
* İlişki ve doküman yönetimi

---

### 📅 Toplantı Yönetimi

* Toplantı oluşturma ve düzenleme
* Katılımcı yönetimi
* Toplantı notları
* Geçmiş toplantı kayıtları

---

### 🕒 Zaman Tüneli

* Tüm aktivitelerin kronolojik takibi
* Toplantı notları ve olay geçmişi
* Filtreleme (kişi / tarih / tür)

---

### 📊 Dashboard

* Toplam kişi sayısı
* Aktif görevler
* Toplantı sayıları
* Yaklaşan doğum günleri
* Bildirim sistemi

---

### ✅ Görev Yönetimi

* Görev oluşturma
* Durum takibi
* Sorumlu atama

---

### 🔔 Bildirim & Aktivite

* Sistem içi bildirimler
* Aktivite günlüğü

---

## 🖼️ Ekran Görüntüleri

### 🚀 LOGIN

![Login](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/LOGIN.png)

---

### 📊 Dashboard

![Dashboard](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/DASHBOARD.png)

---

### ✅ TASKS

![TASKS](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/TASKS.png)

---

### 📅 Toplantılar

![Meetings](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/MEETİNG.png)

![Meetings Detail](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/MEETINGDETAILS.png)

---

### 🕒 Zaman Tüneli

![Timeline](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/CHRONO.png)

---

### 👤 Kişi Detayı
![Person](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/PERSON.png)

![Person Detail](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/PERSONDETAILS.png)

---

### 🔔 Hatırlatıcı
![Reminder](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/REMINDER.png)

---

### ADMIN

![ADMIN](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/ADMIN.png)

![LOG](https://github.com/Dogukanyllmaz/PersonTrack/tree/main/src/LOG.png)

---

## 🏗️ Mimari

Proje, **Clean Architecture + Layered Architecture** prensipleriyle geliştirilmiştir.

```bash
backend/
 ├── API
 ├── Application
 ├── Domain
 ├── Persistence
 ├── Infrastructure
 └── Tests
```

### Kullanılan Yaklaşımlar:

* CQRS (Command / Query Separation)
* Repository Pattern
* Dependency Injection
* SOLID Principles

---

## 🧪 Testler

Proje kapsamında kapsamlı unit testler yazılmıştır.

* Service testleri
* Controller testleri
* Business logic doğrulamaları

✔ 100+ test başarıyla çalışmaktadır

---

## 🔐 Güvenlik

* Role-based authorization
* JWT tabanlı kimlik doğrulama (planlanmış / entegre edilebilir)
* Veri izolasyonu (kurum içi kullanım)

---

## 🛠️ Teknolojiler

* ASP.NET Core
* Entity Framework Core
* SQL Server
* RESTful API
* (Frontend: Modern UI - react)

---

## 🚀 Kurulum

```bash
git clone https://github.com/Dogukanyllmaz/PersonTrack.git
cd PersonTrack
```

```bash
dotnet restore
dotnet build
dotnet run
```

---

## 📌 Gelecek Geliştirmeler

* 🔔 Gerçek zamanlı bildirim sistemi
* 📎 Dosya / doküman ekleme
* 📊 Raporlama ve export (PDF / Excel)
* 🔍 Gelişmiş arama ve filtreleme
* 🧾 Audit Log sistemi

---

## 💬 Sonuç

PersonTrack, organizasyonların iç süreçlerini dijitalleştiren, izlenebilir ve sürdürülebilir hale getiren modern bir backend projesidir.

Kurumsal kullanım senaryoları göz önünde bulundurularak tasarlanmıştır ve genişletilebilir mimarisi sayesinde farklı ihtiyaçlara kolayca adapte edilebilir.

---
