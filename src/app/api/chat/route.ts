import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { messages }: { messages: Message[] } = await request.json();

    const lastMessage = messages[messages.length - 1];
    
    // Simple response logic for the AI assistant
    // In production, you would connect to OpenAI, Claude, or Grok API
    let response = '';
    
    const prompt = lastMessage.content.toLowerCase();
    
    if (prompt.includes('prompt') || prompt.includes('dica')) {
      response = `Aqui estão algumas dicas para criar prompts excelentes:

**Para Imagens:**
- Seja específico: "retrato de uma mulher idosa com olhos verdes, iluminação natural da janela"
- Inclua estilo: "fotografia estilo Annie Leibovitz, preto e branco"
- Adicione detalhes técnicos: "8k, ultra detalhado, profundidade de campo"

**Para Vídeos:**
- Descreva o movimento: "câmera se aproximando lentamente, fogueira crepitando"
- Mencione iluminação: "luz dourada do pôr do sol, sombras suaves"
- Seja claro sobre a ação: "folhas balançando suavemente com o vento"`;
    } else if (prompt.includes('video') || prompt.includes('vídeo')) {
      response = `Para criar vídeos na DESAYRE:

1. **Vá para Studio → Aba Video**
2. **Prepare uma imagem** - o vídeo será gerado a partir dela
3. **Descreva o movimento** - seja específico sobre o que deve se mover
4. **Escolha a duração** - 5 segundos é o padrão

**Exemplo de prompt bom:**
"Câmera orbitando lentamente ao redor do objeto, luz ambiente suave criando sombras dinâmicas"

**Dica:** Quanto mais específico sobre o movimento de câmera, melhor o resultado!`;
    } else if (prompt.includes('imagem') || prompt.includes('image')) {
      response = `Para gerar imagens incríveis:

**Na aba Image do Studio:**
1. Digite sua descrição detalhada
2. Escolha a resolução (1024x1024 para máxima qualidade)
3. Clique em Generate

**Prompts que funcionam bem:**
- "Retrato fotorealista de um gato astronauta, capacete dourado refletindo estrelas, fundo nebulosa cósmica, 8k, ultra detalhado"
- "Paisagem cyberpunk futurista, tokyo à noite, neon lights, chuva, reflexos no asfalto, estilo Blade Runner"

O sistema automaticamente adiciona tags de qualidade para você!`;
    } else if (prompt.includes('custo') || prompt.includes('preço') || prompt.includes('crédito')) {
      response = `**Custos aproximados:**

🖼️ **Imagens:** ~$0.002 por imagem
✏️ **Edições:** ~$0.003 por edição  
🎬 **Vídeos:** ~$0.01 por vídeo (5 segundos)

**Dicas para economizar:**
- Use resoluções menores (512x512) para testes
- Gere em lote apenas quando o prompt estiver pronto
- Use a aba Edit para variações em vez de gerar do zero

Você pode acompanhar os custos totais no dashboard Admin!`;
    } else if (prompt.includes('olá') || prompt.includes('oi') || prompt.includes('help')) {
      response = `Olá! 👋 Sou o assistente da DESAYRE Platform!

Posso te ajudar com:
• 🎨 **Dicas de prompts** para imagens e vídeos
• 🎬 **Como usar** cada funcionalidade
• 💰 **Informações de custo**
• 🚀 **Melhores práticas** para geração de mídia

O que você gostaria de saber?`;
    } else {
      response = `Entendi! Estou aqui para ajudar com a DESAYRE Platform.

Posso te ajudar com:
- Criar prompts melhores para suas gerações
- Explicar como funciona cada ferramenta
- Dar dicas de economia de créditos
- Sugerir estilos e técnicas

Sobre o que você quer conversar?`;
    }

    // Simulate streaming delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      data: {
        message: {
          role: 'assistant',
          content: response,
        },
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
