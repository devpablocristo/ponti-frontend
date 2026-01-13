# Despliegue de ponti-frontend en Google Cloud Run

## Requisitos Previos

- Google Cloud CLI (`gcloud`) instalado y configurado
- Docker instalado
- Acceso al proyecto `new-ponti-dev` en GCP
- Artifact Registry configurado: `ponti-frontend-registry`
- Servicios backend desplegados:
  - `ponti-auth` (autenticación)
  - `ponti-backend` (API principal)

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de Node.js | `production` |
| `BASE_LOGIN_API` | URL de la API de autenticación (incluir `/api/v1`) | `https://ponti-auth-xxx.run.app/api/v1` |
| `BASE_MANAGER_API` | URL de la API principal (incluir `/api/v1`) | `https://ponti-backend-xxx.run.app/api/v1` |
| `X_API_KEY` | API Key para autenticación con el backend | `abc123secreta` |

> **Importante**: Las URLs de las APIs deben incluir `/api/v1` al final.

> **Nota**: La variable `PORT` es reservada por Cloud Run. El Dockerfile expone el puerto 3000.

## Pasos de Despliegue

### 1. Construir la imagen Docker

```bash
cd ponti-frontend

docker build -t us-central1-docker.pkg.dev/new-ponti-dev/ponti-frontend-registry/ponti-frontend:dev .
```

### 2. Subir la imagen a Artifact Registry

```bash
docker push us-central1-docker.pkg.dev/new-ponti-dev/ponti-frontend-registry/ponti-frontend:dev
```

### 3. Desplegar en Cloud Run

```bash
gcloud run deploy ponti-frontend \
  --project=new-ponti-dev \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/new-ponti-dev/ponti-frontend-registry/ponti-frontend:dev \
  --service-account=cloudrun-sa@new-ponti-dev.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=3000 \
  --set-env-vars="NODE_ENV=production,BASE_LOGIN_API=https://ponti-auth-1087442197188.us-central1.run.app/api/v1,BASE_MANAGER_API=https://ponti-backend-1087442197188.us-central1.run.app/api/v1,X_API_KEY=abc123secreta"
```

### 4. Verificar el despliegue

```bash
# Ver logs
gcloud run services logs read ponti-frontend \
  --project=new-ponti-dev \
  --region=us-central1 \
  --limit=50

# Probar endpoint
curl -s -o /dev/null -w "%{http_code}" https://ponti-frontend-1087442197188.us-central1.run.app/
# Respuesta esperada: 200

# Probar API interna
curl https://ponti-frontend-1087442197188.us-central1.run.app/api/ping
# Respuesta esperada: {"message":"UI says Pong!"}
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      ponti-frontend                         │
│  ┌─────────────┐    ┌─────────────────────────────────────┐ │
│  │   React UI  │───►│         Express API Server          │ │
│  │  (Static)   │    │  /api/auth/* → BASE_LOGIN_API       │ │
│  └─────────────┘    │  /api/*      → BASE_MANAGER_API     │ │
│                     └──────────────┬──────────────────────┘ │
└────────────────────────────────────┼────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
          ┌─────────────────┐               ┌─────────────────┐
          │   ponti-auth    │               │  ponti-backend  │
          │  /api/v1/auth/* │               │   /api/v1/*     │
          └─────────────────┘               └─────────────────┘
```

## Rutas de la Aplicación

| Ruta | Descripción |
|------|-------------|
| `/login` | Página de inicio de sesión |
| `/workspace` | Dashboard principal (requiere autenticación) |
| `/api/ping` | Health check de la API interna |
| `/api/auth/*` | Proxy a ponti-auth |
| `/api/*` | Proxy a ponti-backend |

## Actualizar Variables de Entorno

Para actualizar una o más variables sin redesplegar:

```bash
gcloud run services update ponti-frontend \
  --project=new-ponti-dev \
  --region=us-central1 \
  --update-env-vars="VARIABLE=nuevo_valor"
```

## Troubleshooting

### Error 404 en login
**Causa**: `BASE_LOGIN_API` no incluye `/api/v1`.  
**Solución**: Actualizar la variable para incluir `/api/v1`:
```bash
gcloud run services update ponti-frontend \
  --project=new-ponti-dev \
  --region=us-central1 \
  --update-env-vars="BASE_LOGIN_API=https://ponti-auth-xxx.run.app/api/v1"
```

### Error 404 en customers/projects/etc
**Causa**: `BASE_MANAGER_API` no incluye `/api/v1`.  
**Solución**: Actualizar la variable para incluir `/api/v1`:
```bash
gcloud run services update ponti-frontend \
  --project=new-ponti-dev \
  --region=us-central1 \
  --update-env-vars="BASE_MANAGER_API=https://ponti-backend-xxx.run.app/api/v1"
```

### Página en blanco o errores de JS
**Causa**: El build de la UI falló o hay errores en las variables de entorno de Vite.  
**Solución**: Verificar que el build local funcione antes de desplegar:
```bash
cd ui && yarn build
```

## URLs de Producción

- **Service URL**: https://ponti-frontend-1087442197188.us-central1.run.app
- **Login**: https://ponti-frontend-1087442197188.us-central1.run.app/login
- **Workspace**: https://ponti-frontend-1087442197188.us-central1.run.app/workspace
- **Logs**: [Cloud Console](https://console.cloud.google.com/run/detail/us-central1/ponti-frontend/logs?project=new-ponti-dev)

## Orden de Despliegue

Para un despliegue completo desde cero:

1. **ponti-auth** (no tiene dependencias)
2. **ponti-backend** (no tiene dependencias)
3. **ponti-frontend** (depende de las URLs de auth y backend)
