const { templateCompiler } = require('./src/lib/pdf/template-compiler');

// Test the logoImage helper directly
console.log('Testing logoImage helper...');

const testUrl = 'https://www.logoai.com/oss/icons/2021/10/27/gwBCTCVlpMwn55h.png';
const testWidth = '120px';

// Simulate what the template does
const testTemplate = `
{{#if brand_settings.show_logo}}
<div class="logo-container">
    {{#if business_profile.logo_url}}
    {{{logoImage business_profile.logo_url brand_settings.logo_width}}}
    {{/if}}
</div>
{{/if}}
`;

const testContext = {
  brand_settings: {
    show_logo: true,
    logo_width: testWidth
  },
  business_profile: {
    logo_url: testUrl
  }
};

try {
  const result = templateCompiler.compileAndRender(testTemplate, testContext);
  console.log('✅ Template result:', result);
} catch (error) {
  console.error('❌ Template compilation failed:', error);
}