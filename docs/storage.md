# Provedores de Armazenamento (Storage Providers) — Data Plane

## 1. Visão Geral dos Provedores Suportados

O Backup Engine integra-se a 4 provedores de armazenamento fundamentais:

| Provedor | Tipo | Capacidades | Segurança & Isolamento |
| :--- | :--- | :--- | :--- |
| **Local Storage** | Disco Rígido / SSD / USB | Upload atômico, streaming, download parcial, rename atômico | Sanitização contra Path Traversal |
| **SMB / CIFS** | Compartilhamento de Rede Windows / Samba | Autenticação NTLM/Kerberos, isolamento por UNC path | Credenciais seguras via SecretStore |
| **SFTP** | Servidor SSH Remoto | Upload atômico (`.sftp_tmp`), autenticação por chave privada | Criptografia SSH + integridade |
| **S3 / Compatível** | AWS S3, R2, Wasabi, MinIO | Multipart Upload, ETag verification, Server-Side Copy | Signature v4, bloqueio contra deleção perigosa |

---

## 2. Garantias de Atomicidade e Integridade

1. **Uploads Atômicos**: Todos os arquivos gravados no storage utilizam uma extensão temporária (`.tmp` ou `.sftp_tmp`) e só são renomeados para o nome final após a conclusão bem-sucedida da escrita e verificação de checksum SHA-256.
2. **Proteção Anti-Traversal**: Todas as operações de caminho passam por `StoragePathNormalizer`, que valida que o caminho resolvido permanece estritamente confinado dentro do diretório base do storage configurado.
3. **Safe Delete**: Operações de espelhamento e expurgo movem arquivos excluídos para uma área de quarentena temporária antes da remoção definitiva, prevenindo perda acidental de dados por falhas no nó de origem.
