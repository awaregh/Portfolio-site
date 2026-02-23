import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      plan: 'PRO',
      settings: {
        maxWorkflows: 50,
        maxRunsPerDay: 1000,
        aiModel: 'gpt-4o-mini',
      },
    },
  });

  console.log(`✅ Created tenant: ${tenant.name} (${tenant.id})`);

  const passwordHash = await bcrypt.hash('demo1234', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      name: 'Demo Admin',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  const sampleWorkflow = await prisma.workflow.upsert({
    where: { id: 'sample-workflow-001' },
    update: {},
    create: {
      id: 'sample-workflow-001',
      name: 'Content Generation Pipeline',
      description:
        'Generates blog content from a topic using AI, validates it, and formats for publishing.',
      tenantId: tenant.id,
      createdById: adminUser.id,
      version: 1,
      isActive: true,
      definition: {
        metadata: {
          name: 'Content Generation Pipeline',
          version: 1,
          description: 'Automated content generation workflow',
        },
        nodes: {
          'generate-outline': {
            id: 'generate-outline',
            type: 'AI_COMPLETION',
            config: {
              model: 'gpt-4o-mini',
              systemPrompt:
                'You are a content strategist. Generate a detailed blog post outline.',
              userPromptTemplate:
                'Create an outline for a blog post about: {{topic}}',
              temperature: 0.7,
              maxTokens: 1000,
            },
            next: ['validate-outline'],
          },
          'validate-outline': {
            id: 'validate-outline',
            type: 'CONDITION',
            config: {
              expression: 'steps["generate-outline"].output.content.length > 50',
              trueBranch: 'generate-content',
              falseBranch: 'generate-outline',
            },
            next: [],
          },
          'generate-content': {
            id: 'generate-content',
            type: 'AI_COMPLETION',
            config: {
              model: 'gpt-4o-mini',
              systemPrompt:
                'You are a professional blog writer. Write a complete blog post from the given outline.',
              userPromptTemplate:
                'Write a complete blog post based on this outline:\n\n{{steps["generate-outline"].output.content}}',
              temperature: 0.8,
              maxTokens: 4000,
            },
            next: ['format-output'],
          },
          'format-output': {
            id: 'format-output',
            type: 'TRANSFORM',
            config: {
              template: {
                title: '{{input.topic}}',
                content: '{{steps["generate-content"].output.content}}',
                outline: '{{steps["generate-outline"].output.content}}',
                generatedAt: '{{now}}',
                wordCount: '{{steps["generate-content"].output.content.split(" ").length}}',
              },
            },
            next: [],
          },
        },
        edges: [
          { from: 'generate-outline', to: 'validate-outline' },
          { from: 'validate-outline', to: 'generate-content' },
          { from: 'generate-content', to: 'format-output' },
        ],
        entrypoint: 'generate-outline',
      },
    },
  });

  console.log(`✅ Created sample workflow: ${sampleWorkflow.name}`);
  console.log('\n🎉 Seed complete!');
  console.log(`\n📋 Login credentials:`);
  console.log(`   Email: admin@demo.com`);
  console.log(`   Password: demo1234`);
  console.log(`   Tenant API Key: ${tenant.apiKey}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
