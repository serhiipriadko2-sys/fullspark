# Настройка SSL/TLS для Grafana Dashboard экосистемы Искра

## Обзор

Данное руководство описывает полную настройку SSL/TLS шифрования для Grafana dashboard в экосистеме Искра. Настройка включает создание самоподписанных SSL сертификатов, конфигурацию HTTPS соединений и обновление конфигурации Grafana для безопасной работы.

## Содержание

1. [Архитектура SSL/TLS](#архитектура-ssltls)
2. [Требования](#требования)
3. [Структура файлов](#структура-файлов)
4. [Установка и настройка](#установка-и-настройка)
5. [Конфигурация Grafana](#конфигурация-grafana)
6. [Управление сертификатами](#управление-сертификатами)
7. [Мониторинг и логирование](#мониторинг-и-логирование)
8. [Устранение неисправностей](#устранение-неисправностей)
9. [Безопасность](#безопасность)
10. [Производительность](#производительность)

---

## Архитектура SSL/TLS

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Графический интерфейс                      │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Браузер     │  │   Мониторинг │  │   Алерты     │    │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└──────────┼─────────────────┼──────────────────┼────────────┘
           │                 │                  │
           ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    HTTPS соединения (TLS 1.2+)               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │  Порт 3000 HTTPS │  │  Принудительное   │  │  Безопасные │ │
│  │                  │  │   перенаправление │  │   куки      │ │
│  └──────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   SSL Сертификаты       │   │   Grafana Server        │
│  ┌───────────────────┐  │   │  ┌───────────────────┐  │
│  │  grafana.crt      │  │   │  │   HTTPS Engine    │  │
│  │  grafana.key      │  │   │  │   Порт 3000       │  │
│  │  (Самоподписанный) │  │   │  │   TLS 1.2+        │  │
│  └───────────────────┘  │   │  └───────────────────┘  │
└─────────────────────────┘   └─────────────────────────┘
```

### Протоколы и шифры

- **Минимальная версия TLS**: TLSv1.2
- **Предпочтительные шифры**:
  - ECDHE-ECDSA-AES128-GCM-SHA256
  - ECDHE-RSA-AES128-GCM-SHA256
  - ECDHE-ECDSA-AES256-GCM-SHA384
  - ECDHE-RSA-AES256-GCM-SHA384
  - ECDHE-ECDSA-CHACHA20-POLY1305
  - ECDHE-RSA-CHACHA20-POLY1305
  - DHE-RSA-AES128-GCM-SHA256
  - DHE-RSA-AES256-GCM-SHA384

---

## Требования

### Системные требования

- **ОС**: Linux (Ubuntu 18.04+, CentOS 7+, Debian 9+)
- **Grafana**: версия 8.0+
- **OpenSSL**: версия 1.1.1+
- **RAM**: минимум 512 МБ
- **Диск**: минимум 2 ГБ свободного места
- **Сеть**: порт 3000 (HTTPS)

### Права доступа

- Доступ к правам суперпользователя (sudo)
- Возможность изменения systemd сервисов
- Доступ к системным логам

### Сетевые требования

```
Порт 3000: HTTPS (TCP) - Входящий трафик
Порт 443:  HTTPS (TCP) - Рекомендуется для reverse proxy
Порт 80:   HTTP (TCP)  - Для принудительного редиректа на HTTPS
```

---

## Структура файлов

### Каталоги

```
/workspace/ssl_grafana/
├── certs/                     # SSL сертификаты
│   ├── grafana.crt           # Публичный сертификат
│   ├── grafana.key           # Приватный ключ
│   └── grafana.pem           # Объединенный файл (сертификат + ключ)
├── config/                   # Конфигурационные файлы
│   ├── grafana.ini          # Основная конфигурация Grafana
│   └── grafana.service      # Systemd service файл
└── install_ssl_grafana.sh   # Автоматический скрипт установки

/etc/grafana/                 # Системная конфигурация (после установки)
├── grafana.ini              # Основная конфигурация
├── ssl/                     # SSL сертификаты (система)
│   ├── grafana.crt
│   └── grafana.key
└── backup/                  # Резервные копии
    └── YYYYMMDD_HHMMSS/     # Дейтированные папки бэкапов

/var/log/grafana/            # Логи
├── grafana.log              # Основной лог
├── ssl.log                  # SSL события
└── ssl_renewal.log          # Обновление сертификатов

/etc/systemd/system/         # Systemd
└── grafana-server.service  # Service файл для Grafana
```

### Права доступа к файлам

```bash
# Сертификаты
-rw-r--r-- 1 root root  grafana.crt  (644)
-rw------- 1 root root  grafana.key  (600)

# Конфигурация
-rw-r--r-- 1 grafana grafana  grafana.ini  (644)

# Логи
-rw-r--r-- 1 grafana grafana  *.log  (644)
```

---

## Установка и настройка

### Автоматическая установка

1. **Скачайте все файлы конфигурации** в рабочую директорию
2. **Запустите скрипт установки**:

```bash
# Скачайте файлы в /tmp/ssl_grafana/
cd /tmp/ssl_grafana/

# Запустите автоматическую установку
sudo ./install_ssl_grafana.sh
```

### Ручная установка

#### Шаг 1: Создание пользователя Grafana

```bash
# Создание группы
sudo groupadd --system grafana

# Создание пользователя
sudo useradd --system --gid grafana --home-dir /usr/share/grafana \
             --no-create-home --shell /bin/false grafana

# Создание необходимых директорий
sudo mkdir -p /etc/grafana/ssl
sudo mkdir -p /var/log/grafana
sudo mkdir -p /var/lib/grafana
sudo mkdir -p /var/lib/grafana/plugins

# Установка прав доступа
sudo chown -R grafana:grafana /var/log/grafana
sudo chown -R grafana:grafana /var/lib/grafana
sudo chown grafana:grafana /etc/grafana/ssl
sudo chmod 755 /var/log/grafana /var/lib/grafana
```

#### Шаг 2: Генерация SSL сертификатов

```bash
# Переход в директорию сертификатов
cd /etc/grafana/ssl

# Создание конфигурационного файла для OpenSSL
sudo tee openssl.cnf > /dev/null << 'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=RU
ST=Moscow Region
L=Moscow
O=Iskra Ecosystem
OU=Grafana Dashboard
CN=grafana.iskra.local

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = grafana.iskra.local
DNS.2 = localhost
DNS.3 = grafana
IP.1 = 127.0.0.1
IP.2 = 192.168.1.100
EOF

# Генерация сертификата и ключа
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout grafana.key \
    -out grafana.crt \
    -config openssl.cnf

# Установка правильных прав доступа
sudo chmod 600 grafana.key
sudo chmod 644 grafana.crt
sudo chown grafana:grafana grafana.crt grafana.key
```

#### Шаг 3: Установка конфигурации Grafana

```bash
# Копирование конфигурационного файла
sudo cp config/grafana.ini /etc/grafana/grafana.ini

# Установка прав доступа
sudo chown grafana:grafana /etc/grafana/grafana.ini
sudo chmod 644 /etc/grafana/grafana.ini
```

#### Шаг 4: Установка systemd service

```bash
# Копирование service файла
sudo cp config/grafana.service /etc/systemd/system/grafana-server.service

# Перезагрузка systemd
sudo systemctl daemon-reload
```

#### Шаг 5: Настройка firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3000/tcp comment "Grafana HTTPS"

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# iptables (общий)
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
```

#### Шаг 6: Запуск и проверка

```bash
# Запуск Grafana
sudo systemctl start grafana-server

# Включение автозапуска
sudo systemctl enable grafana-server

# Проверка статуса
sudo systemctl status grafana-server

# Проверка логов
sudo journalctl -u grafana-server -f
```

---

## Конфигурация Grafana

### Основные настройки SSL/TLS

```ini
[server]
protocol = https
https_addr = 0.0.0.0
https_port = 3000
cert_file = /etc/grafana/ssl/grafana.crt
cert_key = /etc/grafana/ssl/grafana.key
ssl_min_version = TLSv1.2
ssl_cipher_suites = ECDHE-ECDSA-AES128-GCM-SHA256,ECDHE-RSA-AES128-GCM-SHA256,ECDHE-ECDSA-AES256-GCM-SHA384,ECDHE-RSA-AES256-GCM-SHA384,ECDHE-ECDSA-CHACHA20-POLY1305,ECDHE-RSA-CHACHA20-POLY1305,DHE-RSA-AES128-GCM-SHA256,DHE-RSA-AES256-GCM-SHA384
ssl_prefer_server_ciphers = true
force_ssl = true
domain = grafana.iskra.local
root_url = https://grafana.iskra.local:3000/
```

### Настройки безопасности

```ini
[security]
admin_user = admin
admin_password = IskraSecure2024!
secret_key = IskraEcosystem2024SecretKeyForGrafana
cookie_secure = true
cookie_samesite = strict
allow_embedding = false

[security.encryption]
# Дополнительные настройки шифрования
enabled = true
algorithm = aes256
```

### Настройки аутентификации

```ini
[auth]
login_cookie_name = grafana_session
token_rotation_interval_minutes = 10
disable_login_form = false
disable_signout_menu = false
signout_redirect_url = 
oauth_auto_login = false
oauth_state_cookie_max_age = 60

[auth.anonymous]
enabled = false
org_role = Viewer
hide_version = false
```

### Настройки алертинга

```ini
[alerting]
enabled = true
execute_alerts = true
error_or_timeout = alerting
nodata_or_nullvalues = no_data
concurrent_render_limit = 5
max_attempts = 3
min_re_interval = 30s
```

---

## Управление сертификатами

### Автоматическое обновление

Скрипт автоматически создает cron задачу для обновления сертификатов:

```bash
# Проверка cron задачи
sudo crontab -l

# Логи обновления
sudo tail -f /var/log/grafana/ssl_renewal.log
```

### Ручное обновление сертификата

```bash
# Запуск скрипта обновления
sudo /etc/grafana/renew_ssl_cert.sh

# Проверка нового сертификата
openssl x509 -in /etc/grafana/ssl/grafana.crt -noout -text
```

### Проверка SSL конфигурации

```bash
# Проверка срока действия сертификата
openssl x509 -in /etc/grafana/ssl/grafana.crt -noout -enddate

# Проверка соответствия ключа сертификату
openssl x509 -noout -modulus -in /etc/grafana/ssl/grafana.crt | openssl md5
openssl rsa -noout -modulus -in /etc/grafana/ssl/grafana.key 2>/dev/null | openssl md5

# Проверка SSL соединения
openssl s_client -connect grafana.iskra.local:3000 -servername grafana.iskra.local
```

---

## Мониторинг и логирование

### Системные логи

```bash
# Основные логи Grafana
sudo journalctl -u grafana-server -f

# Логи SSL событий
sudo tail -f /var/log/grafana/ssl.log

# Логи обновления сертификатов
sudo tail -f /var/log/grafana/ssl_renewal.log

# Системные логи
sudo tail -f /var/log/syslog | grep grafana
```

### SSL метрики

Проверка SSL конфигурации в реальном времени:

```bash
# Мониторинг SSL соединений
sudo netstat -tlnp | grep :3000

# Анализ SSL трафика
sudo tcpdump -i any -w /tmp/grafana_ssl.pcap port 3000

# Проверка шифров
nmap --script ssl-enum-ciphers -p 3000 grafana.iskra.local
```

### Производительность SSL

```bash
# Тест скорости SSL соединения
openssl speed rsa2048

# Анализ производительности HTTPS
curl -w "@curl-format.txt" -o /dev/null -s https://grafana.iskra.local:3000
```

Где curl-format.txt содержит:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

---

## Устранение неисправностей

### Частые проблемы

#### 1. Сертификат не загружается

**Симптомы:**
- Grafana не запускается
- Ошибки в логах о неправильных сертификатах

**Решение:**
```bash
# Проверка прав доступа
sudo ls -la /etc/grafana/ssl/

# Проверка целостности сертификата
sudo openssl x509 -in /etc/grafana/ssl/grafana.crt -noout -text

# Проверка соответствия ключа
sudo openssl rsa -in /etc/grafana/ssl/grafana.key -check

# Перезапуск с проверкой
sudo systemctl restart grafana-server
sudo journalctl -u grafana-server -f
```

#### 2. Проблемы с HTTPS соединением

**Симптомы:**
- Сайт не открывается
- Ошибки SSL в браузере

**Решение:**
```bash
# Проверка порта
sudo netstat -tlnp | grep :3000

# Проверка firewall
sudo ufw status
sudo iptables -L | grep 3000

# Тест локального соединения
curl -k https://localhost:3000

# Проверка сертификата
openssl s_client -connect localhost:3000 -servername grafana.iskra.local
```

#### 3. Низкая производительность SSL

**Симптомы:**
- Медленная загрузка страниц
- Высокая загрузка CPU

**Решение:**
```bash
# Проверка использования ресурсов
top -p $(pgrep grafana)

# Оптимизация шифров
# Обновите конфигурацию с более быстрыми шифрами

# Увеличение количества worker процессов
# В конфигурации Grafana
max_worker_processes = 4
```

### Диагностические команды

```bash
# Полная диагностика SSL конфигурации
sudo /etc/grafana/ssl/diagnose.sh

# Проверка всех компонентов
./diagnose_ssl_grafana.sh

# Генерация отчета о безопасности
./security_audit_ssl.sh
```

---

## Безопасность

### Меры безопасности

#### 1. Защита сертификатов

```bash
# Установка прав доступа
sudo chmod 600 /etc/grafana/ssl/grafana.key
sudo chown grafana:grafana /etc/grafana/ssl/*

# Регулярная смена ключей
sudo openssl genpkey -algorithm RSA -out /etc/grafana/ssl/grafana_new.key -pkeyopt rsa_keygen_bits:4096
```

#### 2. Hardening конфигурации

```ini
# Отключение небезопасных протоколов
ssl_min_version = TLSv1.2
ssl_prefer_server_ciphers = true

# Безопасные куки
cookie_secure = true
cookie_samesite = strict
allow_embedding = false

# Ограничение доступа
auth.anonymous.enabled = false
auth.disable_login_form = false
```

#### 3. Мониторинг безопасности

```bash
# Логирование попыток доступа
sudo tail -f /var/log/grafana/access.log

# Мониторинг неудачных входов
grep "login failed" /var/log/grafana/grafana.log

# Проверка SSL состояния
sudo certbot certificates
```

### Аудит безопасности

```bash
# Сканирование SSL/TLS
nmap --script ssl-enum-ciphers -p 3000 grafana.iskra.local
nmap --script ssl-heartbleed -p 3000 grafana.iskra.local

# Проверка HTTP заголовков безопасности
curl -I https://grafana.iskra.local:3000

# Тест на уязвимости
./ssl_security_test.sh grafana.iskra.local 3000
```

---

## Производительность

### Оптимизация SSL

#### 1. Выбор оптимальных шифров

```bash
# Тест производительности шифров
openssl speed aes-128-gcm aes-256-gcm chacha20-poly1305

# Обновление конфигурации с быстрыми шифрами
ssl_cipher_suites = ECDHE-ECDSA-AES128-GCM-SHA256,ECDHE-RSA-AES128-GCM-SHA256
```

#### 2. Настройка кэширования

```ini
# В конфигурации Grafana
cache_type = redis
redis_url = redis://localhost:6379
cache_timeout = 5m
```

#### 3. Оптимизация системных параметров

```bash
# Увеличение лимитов файлов
echo "* soft nofile 10000" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 10000" | sudo tee -a /etc/security/limits.conf

# Оптимизация TCP
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Мониторинг производительности

```bash
# Мониторинг SSL производительности
ssl_perf_monitor.sh

# Анализ времени отклика
curl -w "@curl-format.txt" -o /dev/null -s https://grafana.iskra.local:3000

# Статистика соединений
ss -s
netstat -i
```

---

## Заключение

Настройка SSL/TLS для Grafana в экосистеме Искра обеспечивает:

✅ **Безопасность данных**: Все соединения зашифрованы с использованием современных протоколов TLS 1.2+

✅ **Соответствие стандартам**: Использование рекомендуемых шифров и настроек безопасности

✅ **Автоматизация**: Автоматическое обновление сертификатов и мониторинг

✅ **Производительность**: Оптимизированные настройки для высокой производительности

✅ **Масштабируемость**: Поддержка кластеризации и балансировки нагрузки

### Поддержка

Для получения поддержки обращайтесь к системному администратору или создайте тикет в системе мониторинга экосистемы Искра.

### Обновления документации

Данная документация актуальна на ноябрь 2024 года. Для получения последних версий обращайтесь к репозиторию документации экосистемы Искра.

---

**Версия**: 1.0  
**Дата создания**: 2025-11-06  
**Автор**: Система Искра  
**Лицензия**: Внутреннее использование экосистемы Искра