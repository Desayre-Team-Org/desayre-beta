#!/usr/bin/env node

/**
 * Script de Deploy Automático para Vercel
 * Uso: node scripts/auto-deploy.js [mensagem-do-commit]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  remote: 'origin',
  branch: 'main',
  projectName: 'desayre-beta',
};

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green : 
                type === 'warning' ? colors.yellow : 
                type === 'error' ? colors.red : colors.cyan;
  console.log(`${color}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf-8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    if (!options.ignoreError) {
      log(`❌ Erro ao executar: ${command}`, 'error');
      process.exit(1);
    }
    return null;
  }
}

async function deploy() {
  log('\n🚀 INICIANDO DEPLOY AUTOMÁTICO\n', 'success');
  
  // 1. Verificar se há alterações
  log('📋 Verificando alterações...');
  const status = exec('git status --porcelain', { silent: true }) || '';
  
  if (!status.trim()) {
    log('⚠️  Nenhuma alteração para commitar', 'warning');
    log('🔄 Forçando deploy mesmo assim...\n', 'warning');
  } else {
    // 2. Adicionar arquivos
    log('📦 Adicionando arquivos ao git...');
    exec('git add .');
    
    // 3. Criar commit
    const commitMessage = process.argv[2] || 'auto: update via Kimi Code';
    log(`📝 Criando commit: "${commitMessage}"...`);
    exec(`git commit -m "${commitMessage}"`);
  }
  
  // 4. Push para GitHub
  log('📤 Enviando para GitHub...');
  exec(`git push ${CONFIG.remote} ${CONFIG.branch}`);
  
  // 5. Trigger deploy na Vercel (se tiver token)
  if (process.env.VERCEL_TOKEN) {
    log('🌐 Iniciando deploy na Vercel...');
    exec('npx vercel --prod --yes', { 
      env: { ...process.env, VERCEL_ORG_ID: process.env.VERCEL_ORG_ID, VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID }
    });
    log('✅ Deploy na Vercel concluído!', 'success');
  } else {
    log('\n✅ Código enviado para GitHub!', 'success');
    log('🔄 O deploy na Vercel iniciará automaticamente em alguns segundos...', 'cyan');
    log('📱 Você pode acompanhar em: https://vercel.com/dashboard', 'cyan');
  }
  
  log('\n🎉 PROCESSO CONCLUÍDO!\n', 'success');
}

// Executar
deploy().catch(err => {
  log(`\n❌ ERRO: ${err.message}\n`, 'error');
  process.exit(1);
});
