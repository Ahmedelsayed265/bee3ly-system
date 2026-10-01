# إعداد AWS (للمبتدئين) — بدون ما تبعت secrets في الشات

## مهم

- **متبعتش** Access Key / Secret Key في Cursor أو واتساب.
- MCP **Deploy on AWS** في Cursor = توثيق وتسعير ونصائح CDK فقط — **مش** نشر على حسابك.
- النشر الحقيقي = **AWS CLI** على جهازك + السكربت `scripts/aws-setup-and-deploy-dev.ps1`.

## 1) مفتاح IAM (مرة واحدة)

1. AWS Console → **IAM** → **Users** → **Create user** (مثلاً `bee3ly-deploy`).
2. **Attach policies** → `AdministratorAccess` (للـ dev الأول؛ لاحقًا نضيق الصلاحيات).
3. **Security credentials** → **Create access key** → **CLI**.
4. احفظ **Access key ID** و **Secret access key** في مكان آمن (Password manager).

## 2) ربط الجهاز

افتح **PowerShell** أو **Terminal** في Cursor:

```powershell
aws configure
```

| سؤال | إجابة مقترحة |
|------|----------------|
| Access Key ID | من IAM |
| Secret Access Key | من IAM |
| Default region | `eu-north-1` (Stockholm — زي الكونsole) |
| Default output | `json` |

تحقق:

```powershell
aws sts get-caller-identity
```

لازم يطلع **Account** = `014498663501` (أو حسابك).

## 3) Amplify (URL الفرونت)

1. Console → **Amplify** → New app → GitHub → **Root:** `frontend`.
2. بعد أول deploy انسخ الرابط: `https://main.xxxxx.amplifyapp.com`.

## 4) نشر البنية (CDK)

```powershell
cd d:\bee3ly-system
.\scripts\aws-setup-and-deploy-dev.ps1 -FrontendUrl "https://main.xxxxx.amplifyapp.com"
```

## 5) بعد ما يخلص

اتبع [aws-deployment.md](./aws-deployment.md) من خطوة Gemini + Docker push + `VITE_API_URL`.

## لو حابب Agent يكمّل لوحده

بعد **`aws configure`** على نفس الجهاز، قول في الشات:

> credentials جاهزة على الجهاز، كمّل deploy dev

من غير ما تبعت أي keys.
