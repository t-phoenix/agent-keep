# 40b — Oracle Create Instance form (pick these values)

**For:** [Create compute instance](https://cloud.oracle.com/compute/instances/create?region=ap-hyderabad-1) (example region: **ap-hyderabad-1** Hyderabad)  
**Goal:** Always Free Ampere A1 VM for AgentKeep · **$0** · not a trial  
**Official limits:** [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) → Ampere = **2 OCPU + 12 GB** total for Always Free tenancies

Work top → bottom on the form. If a section is collapsed, expand it.

---

## Before you click Create

1. Confirm top-right **region = your Home Region** (Always Free Ampere usually only there). Hyderabad is fine **if** that is your home region.  
2. If home region is elsewhere, switch the region picker to home first.  
3. Have an SSH public key ready (`~/.ssh/id_ed25519.pub` or generate one).

```bash
# macOS — generate if you don't have a key
ssh-keygen -t ed25519 -C "agentkeep-oracle" -f ~/.ssh/agentkeep_oracle
# You'll paste ~/.ssh/agentkeep_oracle.pub into the form
```

---

## Field-by-field selections

### 1. Name and compartment

| Field | Select / enter |
|-------|----------------|
| **Name** | `agentkeep-api` (any clear name) |
| **Create in compartment** | Your root / default compartment (usually the tenancy name) — leave default unless you already use compartments |

---

### 2. Placement

| Field | Select / enter |
|-------|----------------|
| **Availability domain** | Start with **AD-1** (first option). If create fails with “Out of capacity”, retry **AD-2**, then **AD-3**. |
| **Capacity type** | **On-demand capacity** (default). Do **not** pick Capacity Reservations / Dedicated Hosts. |
| **Fault domain** | Leave **Oracle chooses** / default |

---

### 3. Image and shape (most important)

#### Image

1. Click **Change image** (or Edit).  
2. OS: **Canonical Ubuntu**.  
3. Version: **24.04** (or 22.04 if 24.04 missing).  
4. Prefer the image badge **Always Free Eligible**.  
5. For Ampere you need **aarch64 / Arm** Ubuntu — the Console usually picks the right build once the shape is Ampere.  
6. **Do not** choose **Minimal Ubuntu** for Arm (Oracle docs: use full Ubuntu on Arm shapes).  
7. **Do not** pick Windows, or non–Always Free images (those can bill).

#### Shape

1. Click **Change shape**.  
2. Shape series / processor: **Ampere**.  
3. Shape name: **`VM.Standard.A1.Flex`**.  
4. **Number of OCPUs:** **`2`**  
5. **Amount of memory (GB):** **`12`**  

| OK | Not OK |
|----|--------|
| 2 OCPU / 12 GB (uses full Always Free Ampere) | **4 OCPU / 24 GB** — that was the *old* free cap; on Always Free tenancies it can bill or fail |
| 1 OCPU / 6 GB (also free; weaker) | AMD `VM.Standard.E2.1.Micro` — different free bucket; too small for our API |
| Console shows **Always Free-eligible** | Any “burstable” paid shape, GPU, DenseIO |

Confirm the summary still says **Always Free-eligible** before continuing.

---

### 4. Security — SSH keys

| Field | Select / enter |
|-------|----------------|
| **SSH keys** | **Upload public key files** *or* **Paste public keys** |
| Key content | Paste contents of `agentkeep_oracle.pub` (one line starting `ssh-ed25519` or `ssh-rsa`) |
| Generate | Optional “Generate” in Console — then **download the private key immediately** and store offline |

Login user later: **`ubuntu`** (not `opc` — `opc` is for Oracle Linux).

---

### 5. Networking

| Field | Select / enter |
|-------|----------------|
| **Primary network** | **Create new virtual cloud network** (easiest first time) **or** select an existing VCN if you already have one |
| **Subnet** | **Public subnet** (must be public for a public IP) |
| **Public IPv4 address** | **Assign a public IPv4 address** = **Yes** / checked |
| **Private IP** | Leave automatic |
| **Add SSH keys to …** | Already done above |
| **Network security group** | Optional for now; open ports via **Security List** after create (see below) |
| **DNS / hostname** | Leave default |

Suggested VCN defaults if creating new:

| Field | Value |
|-------|--------|
| VCN CIDR | `10.0.0.0/16` |
| Public subnet CIDR | `10.0.0.0/24` |

**Do not** put the instance only on a private subnet with no public IP unless you already know bastion/tunnel setup.

---

### 6. Boot volume

| Field | Select / enter |
|-------|----------------|
| **Specify custom boot volume size** | Optional: **50 GB** is fine (Always Free includes up to **200 GB** block storage total across volumes — don’t create huge extra volumes) |
| **In-transit encryption** | Default / on is fine |
| **Encryption key** | Oracle-managed (default) — don’t pick a paid KMS key |

---

### 7. Advanced options (leave mostly default)

| Section | What to do |
|---------|------------|
| **Management** → tagging | Optional tag `project=agentkeep` |
| **Availability configuration** | Leave default (live migration etc.) |
| **Oracle Cloud Agent** | Leave plugins default / enabled |
| **Shape configuration** | Already set OCPU/memory above — don’t bump here |
| **Launch options / firmware** | Default |
| **Consistent device paths** | Default |
| **Initialization script (cloud-init)** | **Leave empty** for now (we’ll install Docker/Caddy over SSH) |

---

### 8. Review estimate

- Cost estimate should show **$0.00** / Always Free.  
- If it shows a non-zero monthly compute charge, **stop** — shape/image is wrong (often OCPU > 2 or non-free image).

Then click **Create**.

---

## After Create succeeds

1. Wait until state = **Running**.  
2. Copy **Public IP**.  
3. SSH:
   ```bash
   ssh -i ~/.ssh/agentkeep_oracle ubuntu@<PUBLIC_IP>
   ```
4. **Open firewall ports** (Console):  
   Networking → VCN → public subnet → **Security List** → Ingress Rules → Add:
   - **TCP 22** source `0.0.0.0/0` (or your home IP only — safer)  
   - **TCP 443** source `0.0.0.0/0` (HTTPS for x402)  
   - **TCP 80** source `0.0.0.0/0` (HTTP → ACME / redirect)  
5. Optionally restrict SSH to your IP later.  
6. Set a **Budget** = $0 alert in Billing so accidental paid resources email you.

Then continue `40` §1.A steps 7–10 (Docker, Caddy, deploy).

---

## If Create fails

| Error | What to try |
|-------|-------------|
| **Out of capacity** / internal error on A1 | Switch Availability Domain; retry later; try home region elsewhere; then **Koyeb** (`40` §1.B) |
| Shape not Always Free | Reset to **2 OCPU / 12 GB** A1.Flex |
| Can’t SSH | Check security list port 22; use `ubuntu@`; correct private key |
| Wrong region / no Always Free | Create in **Home Region** only |

---

## Quick “cheat sheet” (copy this)

```
Name:                 agentkeep-api
AD:                   AD-1 (then AD-2 / AD-3)
Image:                Canonical Ubuntu 24.04 (Always Free Eligible, Arm)
Shape:                VM.Standard.A1.Flex
OCPU:                 2
Memory:               12 GB
SSH:                  paste your .pub key
VCN:                  new + public subnet
Public IPv4:          Yes / Assign
Boot volume:          ~50 GB, Oracle-managed encryption
cloud-init:           empty
Cost:                 must show Always Free / $0
```

**SSH:** `ssh -i ~/.ssh/agentkeep_oracle ubuntu@<PUBLIC_IP>`
