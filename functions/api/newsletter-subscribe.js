/* NEWSLETTER SUBSCRIPTION */

const newsletterForm = $('#signup');

if(newsletterForm){

  const newsletterMessage = $('#signupMessage');
  const newsletterButton = $('#newsletterSubmit');
  const firstNameInput = $('#newsletterFirstName');
  const emailInput = $('#newsletterEmail');
  const consentInput = $('#newsletterConsent');
  const websiteInput = newsletterForm.querySelector('[name="website"]');

  function setNewsletterMessage(message,state){
    newsletterMessage.textContent = message;
    newsletterMessage.dataset.state = state || '';
  }

  newsletterForm.addEventListener('submit',async event=>{

    event.preventDefault();

    if(newsletterForm.dataset.subscribed === 'true') return;

    const firstName = firstNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      setNewsletterMessage('Invalid email','error');
      emailInput.focus();
      return;
    }

    if(!firstName){
      setNewsletterMessage('Please enter your first name.','error');
      firstNameInput.focus();
      return;
    }

    if(!consentInput.checked){
      setNewsletterMessage('Please confirm your newsletter subscription.','error');
      consentInput.focus();
      return;
    }

    newsletterButton.disabled = true;
    newsletterButton.textContent = 'SUBSCRIBING…';

    setNewsletterMessage('','');

    try{

      const response = await fetch('/api/newsletter-subscribe',{
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        credentials:'same-origin',
        body:JSON.stringify({
          firstName,
          email,
          consent:consentInput.checked,
          website:websiteInput.value
        })
      });

      const result = await response.json().catch(()=>({}));

      if(!response.ok || !result.success){

        if(
          result.error === 'Invalid email' ||
          result.error === 'Enter a valid email address.'
        ){
          setNewsletterMessage('Invalid email','error');
        }else{
          setNewsletterMessage(
            result.error || 'Subscription could not be completed. Please try again.',
            'error'
          );
        }

        newsletterButton.disabled = false;
        newsletterButton.textContent = 'SUBSCRIBE';
        return;
      }

      newsletterForm.dataset.subscribed = 'true';

      newsletterForm.querySelectorAll('input').forEach(input=>{
        input.disabled = true;
      });

      newsletterButton.textContent = 'Newsletter Subscribed';
      newsletterButton.disabled = true;

      if(result.alreadySubscribed){
        setNewsletterMessage('Newsletter Subscribed','success');
      }else{
        setNewsletterMessage(
          'Successfully subscribed! You will receive news mail updates from us',
          'success'
        );
      }

    }catch(error){

      console.error('Newsletter subscription failed:',error);

      setNewsletterMessage(
        'Connection problem. Please try again shortly.',
        'error'
      );

      newsletterButton.disabled = false;
      newsletterButton.textContent = 'SUBSCRIBE';
    }

  });
}
