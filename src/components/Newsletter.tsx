import { useState } from 'react'
import { Heading } from './catalyst/heading'
import { Text } from './catalyst/text'
import { Input } from './catalyst/input'
import { Button } from './catalyst/button'
import { Field, Label } from './catalyst/fieldset'
import { Alert, AlertTitle, AlertDescription, AlertActions } from './catalyst/alert'

export default function Newsletter() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString(),
      })

      if (response.ok) {
        form.reset()
        setIsOpen(true)
      } else {
        console.error('Form submission failed')
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="newsletter" className="bg-white dark:bg-zinc-900 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
        <div className="max-w-xl text-balance lg:col-span-7">
          <Heading level={2} className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Want community news and updates?
          </Heading>
          <Text className="mt-4 text-lg">
            Sign up for our newsletter to stay informed about upcoming events, book club selections, and technical content.
          </Text>
        </div>
        <form
          name="newsletter"
          method="POST"
          className="w-full max-w-md lg:col-span-5 lg:pt-2"
          data-netlify="true"
          onSubmit={handleSubmit}
        >
          <input type="hidden" name="form-name" value="newsletter" />
          <div className="flex gap-x-4">
            <Field className="flex-auto">
              <Label htmlFor="email-address" className="sr-only">
                Email address
              </Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                autoComplete="email"
              />
            </Field>
            <Button type="submit" color="indigo" disabled={isSubmitting}>
              {isSubmitting ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </div>
          <Text className="mt-4 text-sm">
            We care about your data. Read our{' '}
            <a href="#" className="whitespace-nowrap font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
              privacy policy
            </a>
            .
          </Text>
        </form>
      </div>

      <Alert open={isOpen} onClose={() => setIsOpen(false)} size="sm">
        <AlertTitle>Thank you for subscribing!</AlertTitle>
        <AlertDescription>
          You've been added to our newsletter. We'll keep you updated with community news and events.
        </AlertDescription>
        <AlertActions>
          <Button onClick={() => setIsOpen(false)} color="indigo">
            Got it
          </Button>
        </AlertActions>
      </Alert>
    </div>
  )
}
