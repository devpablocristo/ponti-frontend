# Configuración de GitHub Secrets para ponti-frontend

## Secrets Requeridos

Configurar estos secrets en **Settings → Secrets and variables → Actions** del repositorio:

| Secret | Descripción | Valor de ejemplo |
|--------|-------------|------------------|
| `GCP_SA_KEY` | JSON de la Service Account de GCP con permisos para Cloud Run y Artifact Registry | `{"type": "service_account", ...}` |
| `BASE_LOGIN_API` | URL de la API de autenticación (**incluir /api/v1**) | `https://ponti-auth-1087442197188.us-central1.run.app/api/v1` |
| `BASE_MANAGER_API` | URL de la API principal (**incluir /api/v1**) | `https://ponti-backend-1087442197188.us-central1.run.app/api/v1` |
| `X_API_KEY` | API Key para autenticación con el backend | `abc123secreta` |

> ⚠️ **Importante**: Las URLs de `BASE_LOGIN_API` y `BASE_MANAGER_API` deben incluir `/api/v1` al final.

## Crear Service Account Key

```bash
# Crear Service Account (si no existe)
gcloud iam service-accounts create github-actions-sa \
  --display-name="GitHub Actions Service Account" \
  --project=new-ponti-dev

# Asignar roles necesarios
gcloud projects add-iam-policy-binding new-ponti-dev \
  --member="serviceAccount:github-actions-sa@new-ponti-dev.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding new-ponti-dev \
  --member="serviceAccount:github-actions-sa@new-ponti-dev.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding new-ponti-dev \
  --member="serviceAccount:github-actions-sa@new-ponti-dev.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Generar key JSON
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-sa@new-ponti-dev.iam.gserviceaccount.com \
  --project=new-ponti-dev

# El contenido de github-actions-key.json va en el secret GCP_SA_KEY
cat github-actions-key.json
```

## Ramas y Ambientes

| Rama | Tag de imagen | NODE_ENV |
|------|---------------|----------|
| `dev` | `dev` | `production` |
| `staging` | `stg` | `staging` |
| `main` | `prod` | `production` |

## Flujo de Deploy

```
push to dev     → build → push :dev  → deploy
push to staging → build → push :stg  → deploy
push to main    → build → push :prod → deploy
```

## Dependencias

El frontend depende de que los siguientes servicios estén desplegados:

1. **ponti-auth** → URL va en `BASE_LOGIN_API`
2. **ponti-backend** → URL va en `BASE_MANAGER_API`

Si las URLs de los backends cambian, actualizar los secrets correspondientes.

## Configuración Multi-Ambiente (Opcional)

Si querés usar diferentes backends por ambiente, podés crear secrets específicos:

| Secret | Dev | Staging | Prod |
|--------|-----|---------|------|
| `BASE_LOGIN_API_DEV` | URL dev | - | - |
| `BASE_LOGIN_API_STG` | - | URL stg | - |
| `BASE_LOGIN_API_PROD` | - | - | URL prod |

Y modificar el workflow para usar el secret correspondiente según la rama.
